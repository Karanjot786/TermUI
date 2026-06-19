export const readFile = async () => '';
export const writeFile = async () => {};
export const mkdir = async () => {};
export const spawn = () => ({ on: () => {} });
export const execSync = () => '';
export const readFileSync = () => '';
export const writeFileSync = () => {};
export const mkdirSync = () => {};
export const existsSync = () => false;
export const statSync = () => ({ isDirectory: () => false, isFile: () => true });
export const lstatSync = () => ({ isDirectory: () => false, isFile: () => true });
export const rmSync = () => {};
export const rmdirSync = () => {};
export const unlinkSync = () => {};
export const renameSync = () => {};
export const copyFileSync = () => {};
export const appendFileSync = () => {};
export const readdirSync = () => [];
export const realpathSync = () => '';
export const accessSync = () => {};
export const chmodSync = () => {};
export const chownSync = () => {};
export const utimesSync = () => {};
export const openSync = () => 0;
export const closeSync = () => {};
export const readSync = () => 0;
export const writeSync = () => 0;
export const fstatSync = () => ({ isDirectory: () => false, isFile: () => true });
export const ftruncateSync = () => {};
export const fchmodSync = () => {};
export const fchownSync = () => {};
export const fdatasyncSync = () => {};
export const fsyncSync = () => {};
export const futimesSync = () => {};
export const symlinkSync = () => {};
export const readlinkSync = () => '';
export const createReadStream = () => ({ on: () => {}, pipe: () => {} });
export const createWriteStream = () => ({ on: () => {}, write: () => {}, end: () => {} });
export const watch = () => ({ on: () => {}, close: () => {} });
export const watchFile = () => {};
export const unwatchFile = () => {};
export const promises = {
  readFile, writeFile, mkdir, rmdir: mkdir, unlink: mkdir, rename: mkdir, copyFile: mkdir, appendFile: mkdir,
  readdir: async () => [], stat: async () => ({ isDirectory: () => false, isFile: () => true }),
  lstat: async () => ({ isDirectory: () => false, isFile: () => true }),
  access: async () => {}, chmod: async () => {}, chown: async () => {}, utimes: async () => {},
  open: async () => ({ close: async () => {} })
};
