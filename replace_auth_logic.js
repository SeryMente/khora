const fs = require('fs');
const filePath = 'khora-web/app/bitacora/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const oldAuthLogic = `  const [loginPass, setLoginPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loginError, setLoginError] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("khora_auth") === "1") {
      setIsAuth(true);
    }
    setAuthChecked(true);
  }, []);

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    if (loginUser.trim() === "willfreeman" && loginPass === "A02122310a!") {
      setIsAuth(true);
      setLoginError(false);
      if (typeof window !== "undefined") localStorage.setItem("khora_auth", "1");
    } else {
      setLoginError(true);
    }
  };`;

const newAuthLogic = `  const [loginPass, setLoginPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loginError, setLoginError] = useState(false);
  const [usePinLogin, setUsePinLogin] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [hasPinConfigured, setHasPinConfigured] = useState(false);

  useEffect(() => {
    if (checkAuthSession()) {
      setIsAuth(true);
    }
    // Check if user has PIN
    const hasPin = hasCryptoState();
    setHasPinConfigured(hasPin);
    if (hasPin) {
      setUsePinLogin(true);
    }
    setAuthChecked(true);
  }, []);

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    if (loginUser.trim() === "willfreeman" && loginPass === "A02122310a!") {
      setIsAuth(true);
      setLoginError(false);
      setAuthSession();
    } else {
      setLoginError(true);
    }
  };

  const handlePinLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (pinInput.length !== 4) {
      setPinError("El PIN debe tener 4 dígitos.");
      return;
    }
    const isValid = await verifyPIN(pinInput);
    if (isValid) {
      setAuthSession();
      setIsAuth(true);
      setPinError("");
    } else {
      setPinError("PIN incorrecto.");
    }
  };`;

content = content.replace(oldAuthLogic, newAuthLogic);

fs.writeFileSync(filePath, content);
