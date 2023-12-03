import { join, resolve } from "path";
import { mkdir, writeFile } from "fs/promises";
import obj_contract_name_artifact from "./artifacts";
import obj_contract_name_obj_part_dependent_arr, { ObjPartDependentArr } from "./mapping";
import { ConsoleColor, colorInfo } from "../helpers";

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

async function syncContract({
  abi_stringified,
  contract_name,
}: {
  abi_stringified: string;
  contract_name: ContractName;
}) {
  const dir = resolvePath("contracts/lottery/abis");
  await mkdir(dir, { recursive: true });
  const path = join(dir, `${contract_name}.ts`);
  await syncTs({ abi_stringified, contract_name, path });
}
function syncAbi({
  abi_stringified,
  contract_name,
  obj_part_dependent_arr,
  promises,
}: {
  abi_stringified: string;
  contract_name: ContractName;
  obj_part_dependent_arr: ObjPartDependentArr;
  promises: Promise<void>[];
}) {
  if ("abi" in obj_part_dependent_arr) {
    const dependent_arr = obj_part_dependent_arr.abi;
    for (const dependent of dependent_arr) {
      const dependent_path = resolvePath(dependent);
      const ext = dependent_path.match(/\.(\w+)$/)?.[1];
      switch (ext) {
        case "json":
          promises.push(syncJson({ abi_stringified, path: dependent_path }));
          continue;
        case "ts":
          promises.push(syncTs({ abi_stringified, contract_name, path: dependent_path }));
          continue;
        default:
          console.error(`Unknown extension: ${ext}`);
          continue;
      }
    }
  }
}

export default async function sync() {
  const promises = [];
  for (const contract_name in obj_contract_name_artifact) {
    // Ignore inherited properties
    if (!Object.hasOwn(obj_contract_name_artifact, contract_name)) continue;
    const { abi } = obj_contract_name_artifact[contract_name as ContractName];
    const abi_stringified = JSON.stringify(abi, null, 2);

    promises.push(syncContract({ abi_stringified, contract_name: contract_name as ContractName }));

    if (!(contract_name in obj_contract_name_obj_part_dependent_arr)) continue;
    const obj_part_dependent_arr = obj_contract_name_obj_part_dependent_arr[contract_name as ContractName];

    syncAbi({ abi_stringified, contract_name: contract_name as ContractName, obj_part_dependent_arr, promises });
  }
  return Promise.all(promises);
}
