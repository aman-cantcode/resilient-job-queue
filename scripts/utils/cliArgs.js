export function getArg(flag, fallback) {
  const found = process.argv.find((arg) => arg.startsWith(`--${flag}=`));
  return found ? found.split('=')[1] : fallback;
}
