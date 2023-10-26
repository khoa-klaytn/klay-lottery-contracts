declare global {
  type HexStr = `0x${string}`;
  type FnInput = string | bigint | boolean;
  type FnInputs = ReadonlyArray<FnInput>;

  type ObjAbiFnInputKeyType = Record<"address", HexStr> &
    Record<"string" | `bytes${number}`, string> &
    Record<`${"" | "u"}int${number}`, bigint> &
    Record<"bool", boolean>;
  type AbiFnInputKey = keyof ObjAbiFnInputKeyType;
  type AbiFnInput = { type: AbiFnInputKey; name: string };
  type AbiFnInputs = ReadonlyArray<AbiFnInput>;
}

export {};
