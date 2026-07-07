export function simulate<T = void>(ms = 900, value?: T, failRate = 0): Promise<T> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() < failRate) reject(new Error("Falha simulada de rede"));
      else resolve(value as T);
    }, ms);
  });
}
