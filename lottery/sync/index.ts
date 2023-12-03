import { join, resolve } from "path";
import { mkdir, writeFile } from "fs/promises";
import { createReadStream } from "fs";
import { createInterface } from "readline";
import obj_contract_name_artifact from "./artifacts";
import obj_contract_name_obj_part_dependent_arr, { ObjPartDependentArr, TuplePathPatternKey } from "./mapping";
import { ConsoleColor, WrappedPattern, colorInfo } from "../helpers";
import config, { mainnet } from "../config";

const submodules_dir = resolve(__dirname, "../../..");

function resolvePath(...paths: string[]) {
  return join(submodules_dir, ...paths);
}
async function syncTs({
  abi_stringified,
  contract_name,
  path,
}: {
  abi_stringified: string;
  contract_name: ContractName;
  path: string;
}) {
  const var_name = `${contract_name}ABI`;
  await writeFile(path, `const ${var_name} = ${abi_stringified} as const;\n\nexport default ${var_name};\n`);
  colorInfo("Synced", path, ConsoleColor.FgGreen);
}
async function syncJson({ abi_stringified, path }: { abi_stringified: string; path: string }) {
  await writeFile(path, abi_stringified);
  colorInfo("Synced", path, ConsoleColor.FgGreen);
}
export async function findNReplace({ path, pattern, replace }: { path: string; pattern: string; replace: string }) {
  const regex = new RegExp(pattern);
  let contents = "";
  const stream = createReadStream(path);
  const rl = createInterface({ input: stream });
  for await (const line of rl) {
    if (typeof line !== "string") continue;
    const test = regex.test(line);
    if (test) {
      contents += line.replace(regex, replace);
    } else {
      contents += line;
    }
    contents += "\n";
  }
  await writeFile(path, contents);
  colorInfo("Synced", `${path} ${ConsoleColor.FgYellow}/${pattern}/`, ConsoleColor.FgGreen);
}

const contract_dir = resolvePath("contracts/lottery");
const contract_abis_dir = join(contract_dir, "abis");
async function syncContractAbi({
  abi_stringified,
  contract_name,
}: {
  abi_stringified: string;
  contract_name: ContractName;
}) {
  await mkdir(contract_abis_dir, { recursive: true });
  const path = join(contract_abis_dir, `${contract_name}.ts`);
  await syncTs({ abi_stringified, contract_name, path });
}
const obj_contract_name_part_obj_pattern = WrappedPattern({
  pattern: ".+",
  before: "const obj_contract_name_part_obj: ObjContractNamePartObj = ",
});
async function syncObjContractNamePartObj() {
  const path = join(contract_dir, `config/${mainnet ? "mainnet" : "testnet"}.private.ts`);
  await findNReplace({
    path,
    pattern: obj_contract_name_part_obj_pattern,
    replace: JSON.stringify(config.obj_contract_name_part_obj),
  });
  colorInfo("Synced", path, ConsoleColor.FgGreen);
}
function* syncAbi({
  abi_stringified,
  contract_name,
  obj_part_dependent_arr,
}: {
  abi_stringified: string;
  contract_name: ContractName;
  obj_part_dependent_arr: ObjPartDependentArr;
}) {
  if ("abi" in obj_part_dependent_arr) {
    const dependent_arr = obj_part_dependent_arr.abi;
    for (const dependent of dependent_arr) {
      const dependent_path = resolvePath(dependent);
      const ext = dependent_path.match(/\.(\w+)$/)?.[1];
      switch (ext) {
        case "json":
          yield syncJson({ abi_stringified, path: dependent_path });
          continue;
        case "ts":
          yield syncTs({ abi_stringified, contract_name, path: dependent_path });
          continue;
        default:
          console.error(`Unknown extension: ${ext}`);
          continue;
      }
    }
  }
}
/**
 * Sync @see TuplePathPatternKey
 */
function* syncTPP({
  key,
  value,
  obj_part_dependent_arr,
}: {
  key: TuplePathPatternKey;
  value: string;
  obj_part_dependent_arr: ObjPartDependentArr;
}) {
  if (key in obj_part_dependent_arr) {
    const dependent_arr = obj_part_dependent_arr[key];
    for (const [dependent, regex] of dependent_arr) {
      const dependent_path = resolvePath(dependent);
      yield findNReplace({ path: dependent_path, pattern: regex, replace: value });
    }
  }
}

export default async function sync() {
  const promises: Promise<unknown>[] = [];

  promises.push(syncObjContractNamePartObj());

  for (const contract_name in obj_contract_name_artifact) {
    // Ignore inherited properties
    if (!Object.hasOwn(obj_contract_name_artifact, contract_name)) continue;
    const { abi } = obj_contract_name_artifact[contract_name as ContractName];
    const abi_stringified = JSON.stringify(abi, null, 2);

    promises.push(syncContractAbi({ abi_stringified, contract_name: contract_name as ContractName }));

    if (!(contract_name in obj_contract_name_obj_part_dependent_arr)) continue;
    const obj_part_dependent_arr = obj_contract_name_obj_part_dependent_arr[contract_name as ContractName];

    const syncAbi_gen = syncAbi({
      abi_stringified,
      contract_name: contract_name as ContractName,
      obj_part_dependent_arr,
    });
    for (const promise of syncAbi_gen) {
      promises.push(promise);
    }
    for (const key of ["address", "startBlock"] as const) {
      const gen = syncTPP({
        key,
        value: config.obj_contract_name_part_obj[contract_name as ContractName][key],
        obj_part_dependent_arr,
      });
      for (const promise of gen) {
        promises.push(promise);
      }
    }
  }
  return Promise.all(promises);
}
