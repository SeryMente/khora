"""Synthetic engine evaluation, NOT a vault client or production bootstrap.
No real user data. A temporary OpenBao dev server is bound only to loopback;
all credentials stay in process memory and are discarded when it terminates.
The TOTP generator below is exclusively a fixture; production uses OpenBao/Ente.
"""
import argparse,sys,base64,hashlib,hmac,json,os,pathlib,secrets,socket,struct,subprocess,tempfile,time,urllib.request,urllib.error,urllib.parse

def run(binary,output,age_binary):
    out=pathlib.Path(output);out.parent.mkdir(parents=True,exist_ok=True)
    evidence={'scope':'SYNTHETIC_ENGINE_EVALUATION_ONLY','production_changed':False,'real_corpus_read':False,'tests':[],'limits':['OpenBao dev mode is not production deployment','No real Ente enrollment or desktop client tested','Only small synthetic file encrypted; no large-file storage, backup or restore certified','Service administrator can decrypt transit material; not zero-knowledge','Authorized malicious host can retain released material','Release binary digest checked; publisher signature not independently checked']}
    def check(name,ok):
        evidence['tests'].append({'name':name,'passed':bool(ok)})
        if not ok:raise RuntimeError('CHECK_FAILED:'+name)
    root=secrets.token_urlsafe(40)
    with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
    origin=f'http://127.0.0.1:{port}'
    env=os.environ.copy();env['BAO_DEV_ROOT_TOKEN_ID']=root
    proc=None; workspace=None
    def api(path,body=None,token=None):
        headers={'Content-Type':'application/json'}
        if token:headers['X-Vault-Token']=token
        req=urllib.request.Request(origin+'/v1/'+path,data=None if body is None else json.dumps(body).encode(),headers=headers)
        try:
            with urllib.request.urlopen(req,timeout=8) as r:
                raw=r.read();return r.status,json.loads(raw) if raw else {}
        except urllib.error.HTTPError as e:
            raw=e.read()
            try:data=json.loads(raw)
            except Exception:data={}
            return e.code,data
    def must(path,body=None,token=None):
        status,data=api(path,body,root if token is None else token)
        if status not in (200,204):raise RuntimeError('API_FAILED:'+path+':HTTP_'+str(status))
        return data
    def otp(secret,offset=0):
        key=base64.b32decode(secret+'='*((-len(secret))%8));step=int(time.time()/30)+offset
        mac=hmac.new(key,struct.pack('>Q',step),hashlib.sha1).digest();at=mac[-1]&15
        return str((struct.unpack('>I',mac[at:at+4])[0]&0x7fffffff)%1000000).zfill(6)
    try:
        if not pathlib.Path(binary).is_file():raise RuntimeError('SAFE_STOP:ENGINE_BINARY_MISSING')
        age=pathlib.Path(age_binary).resolve();keygen=age.with_name('age-keygen')
        if not age.is_file() or not keygen.is_file():raise RuntimeError('SAFE_STOP:FILE_ENGINE_MISSING')
        workspace=tempfile.TemporaryDirectory(prefix='khora-synthetic-')
        evidence['file_engine']=subprocess.run([str(age),'--version'],capture_output=True,check=True,timeout=5).stdout.decode().strip()
        identity=subprocess.run([str(keygen)],capture_output=True,check=True,timeout=5).stdout
        recipient=subprocess.run([str(keygen),'-y'],input=identity,capture_output=True,check=True,timeout=5).stdout.decode().strip()
        sample=b'KHORA-SYNTHETIC-NOT-AN-AUTOBIOGRAPHY\n'+secrets.token_bytes(2048)
        encrypted=subprocess.run([str(age),'-r',recipient],input=sample,capture_output=True,check=True,timeout=5).stdout
        encrypted_path=pathlib.Path(workspace.name)/'synthetic.age';encrypted_path.write_bytes(encrypted)
        wrong_identity=subprocess.run([str(keygen)],capture_output=True,check=True,timeout=5).stdout
        denied_file=subprocess.run([str(age),'-d','-i','-',str(encrypted_path)],input=wrong_identity,capture_output=True,timeout=5)
        check('downloaded_file_without_correct_identity_cannot_decrypt',denied_file.returncode!=0 and not denied_file.stdout)
        proc=subprocess.Popen([str(pathlib.Path(binary).resolve()),'server','-dev',f'-dev-listen-address=127.0.0.1:{port}'],env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        for _ in range(120):
            try:
                status,_=api('sys/health')
                if status==200:break
            except (OSError,urllib.error.URLError):pass
            time.sleep(.1)
        else:raise RuntimeError('SAFE_STOP:ENGINE_STARTUP_TIMEOUT')
        evidence['engine']=must('sys/health')['version']
        must('sys/auth/userpass',{'type':'userpass'})
        accessor=must('sys/auth')['data']['userpass/']['accessor']
        must('sys/mounts/transit',{'type':'transit'})
        for keyname in ('khora-synthetic-a','khora-synthetic-b'):
            must('transit/keys/'+keyname,{'type':'aes256-gcm96','exportable':False,'allow_plaintext_backup':False})
        policy='path "transit/decrypt/khora-synthetic-a" { capabilities = ["update"] }'
        must('sys/policies/acl/khora-open-once',{'policy':policy})
        method=must('identity/mfa/method/totp',{'issuer':'Khora-SYNTHETIC-ONLY','method_name':'khora-synthetic','period':30,'algorithm':'SHA1','digits':6,'skew':0,'max_validation_attempts':3})['data']['method_id']
        people={}
        for name in ('success','wrong','replay','expiry','isolation','attempts'):
            user='khora-synthetic-'+name;password=secrets.token_urlsafe(32)
            must('auth/userpass/users/'+user,{'password':password,'token_policies':['khora-open-once'],'token_no_default_policy':True,'token_num_uses':1,'token_ttl':5,'token_explicit_max_ttl':5})
            pre=must('auth/userpass/login/'+user,{'password':password},token='')
            entity=pre['auth']['entity_id']
            uri=must('identity/mfa/method/totp/admin-generate',{'method_id':method,'entity_id':entity})['data']['url']
            secret=urllib.parse.parse_qs(urllib.parse.urlsplit(uri).query)['secret'][0]
            must('auth/token/revoke',{'token':pre['auth']['client_token']})
            people[name]={'user':user,'password':password,'secret':secret}
        must('identity/mfa/login-enforcement/khora-every-open',{'mfa_method_ids':[method],'auth_method_accessors':[accessor]})
        plain=identity;encoded=base64.b64encode(plain).decode()
        wrapped=must('transit/encrypt/khora-synthetic-a',{'plaintext':encoded})['data']['ciphertext']
        other=must('transit/encrypt/khora-synthetic-b',{'plaintext':encoded})['data']['ciphertext']
        check('portable_ciphertext_does_not_contain_plain_key',encoded not in wrapped and wrapped.startswith('vault:v1:'))
        status,_=api('transit/decrypt/khora-synthetic-a',{'ciphertext':wrapped})
        check('without_authentication_no_key_release',status in (400,403))
        def challenge(person):
            d=must('auth/userpass/login/'+person['user'],{'password':person['password']},token='')
            check('primary_factor_alone_has_no_access_token_'+person['user'].split('-')[-1],not d['auth'].get('client_token'))
            return d['auth']['mfa_requirement']['mfa_request_id']
        def validate(person,request,code=None):
            return api('sys/mfa/validate',{'mfa_request_id':request,'mfa_payload':{method:[otp(person['secret']) if code is None else code]}})
        # Use separate synthetic identities so no delay is hidden between successful OTPs.
        p=people['wrong'];req=challenge(p);bad='000000' if otp(p['secret'])!='000000' else '111111'
        status,data=validate(p,req,bad)
        check('wrong_code_has_no_access_token',status>=400 or not data.get('auth',{}).get('client_token'))
        p=people['success'];req=challenge(p);status,data=validate(p,req)
        check('valid_password_and_otp_issue_one_use_token',status==200 and bool(data.get('auth',{}).get('client_token')) and data['auth'].get('num_uses')==1)
        token=data['auth']['client_token']
        check('short_token_lifetime',0<data['auth']['lease_duration']<=5)
        status,data=api('transit/decrypt/khora-synthetic-a',{'ciphertext':wrapped},token)
        check('authorized_unwrap_matches_original_key',status==200 and base64.b64decode(data['data']['plaintext'])==plain)
        released=base64.b64decode(data['data']['plaintext'])
        recovered=subprocess.run([str(age),'-d','-i','-',str(encrypted_path)],input=released,capture_output=True,check=True,timeout=5).stdout
        check('online_authorization_unlocks_actual_encrypted_file',recovered==sample)
        changed=bytearray(encrypted);changed[-1]^=1;tampered=pathlib.Path(workspace.name)/'tampered.age';tampered.write_bytes(changed)
        failed=subprocess.run([str(age),'-d','-i','-',str(tampered)],input=released,capture_output=True,timeout=5)
        check('tampered_file_is_rejected',failed.returncode!=0)
        status,_=api('transit/decrypt/khora-synthetic-a',{'ciphertext':wrapped},token)
        check('used_token_cannot_open_again',status>=400)
        status,data=validate(p,req)
        check('same_mfa_request_cannot_be_replayed',status>=400 or not data.get('auth',{}).get('client_token'))
        req2=challenge(p);status,data=validate(p,req2)
        check('used_otp_cannot_authorize_new_request',status>=400 or not data.get('auth',{}).get('client_token'))
        p=people['isolation'];req=challenge(p);status,data=validate(p,req);token=data['auth']['client_token']
        status,_=api('transit/decrypt/khora-synthetic-b',{'ciphertext':other},token)
        check('token_for_a_cannot_unwrap_b',status>=400)
        p=people['expiry'];req=challenge(p);status,data=validate(p,req);token=data['auth']['client_token']
        time.sleep(6)
        status,_=api('transit/decrypt/khora-synthetic-a',{'ciphertext':wrapped},token)
        check('expired_unused_token_cannot_open',status>=400)
        p=people['attempts'];req=challenge(p);bad='000000' if otp(p['secret'])!='000000' else '111111'
        denied=[]
        for _ in range(4):
            status,data=validate(p,req,bad);denied.append(status>=400 and not data.get('auth',{}).get('client_token'))
        check('repeated_invalid_codes_never_release_token',all(denied))
        status,data=validate(p,req)
        check('valid_code_denied_after_attempt_budget_exhausted',status>=400 and not data.get('auth',{}).get('client_token'))
        p=people['replay'];req=challenge(p);status,data=validate(p,req,otp(p['secret'],-2))
        check('stale_code_cannot_authorize',status>=400 and not data.get('auth',{}).get('client_token'))
        # This checks a denied sequence, not production per-IP/distributed rate limiting.
        evidence['result']='PASSED_SYNTHETIC_ENGINE_EVALUATION'
    except Exception as exc:
        evidence['result']='SAFE_STOP';evidence['failure']=str(exc)[:220]
    finally:
        if proc is not None:
            proc.terminate()
            try:proc.wait(timeout=8)
            except subprocess.TimeoutExpired:proc.kill();proc.wait(timeout=5)
        if workspace is not None:workspace.cleanup()
        evidence['server_stopped']=proc is None or proc.poll() is not None
        evidence['passed']=sum(x['passed'] for x in evidence['tests']);evidence['total']=len(evidence['tests'])
        out.write_text(json.dumps(evidence,ensure_ascii=False,indent=2)+'\n')
        print(json.dumps(evidence,ensure_ascii=False))
    return evidence

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--bao',required=True);parser.add_argument('--evidence',required=True);parser.add_argument('--age',required=True);args=parser.parse_args()
    result=run(args.bao,args.evidence,args.age)
    sys.exit(0 if result["result"]=="PASSED_SYNTHETIC_ENGINE_EVALUATION" else 2)
