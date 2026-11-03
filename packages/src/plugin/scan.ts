import { init, parse } from 'es-module-lexer';

/**
 * スケッチファイルを実行せずに、値の名前付き export を返す。
 * es-module-lexer v3 は TypeScript を直接解析でき、型だけの export を判別できる。
 */
export async function scanExports(code: string, filename: string): Promise<string[]> {
  await init;
  const [, exports] = parse(code, filename);
  return exports.flatMap((e) =>
    e.type !== 'reexport-all' && !e.typeOnly && e.name !== 'default' ? [e.name] : [],
  );
}
