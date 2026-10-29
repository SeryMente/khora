import {getDb} from '../neon';
import {cifrarTexto,descifrarTexto} from '../cripto';
import {BlogRepository} from './repository';
export function blogRepository(){return new BlogRepository(getDb(),{encrypt:cifrarTexto,decrypt:descifrarTexto});}
