import sync from "../sync";
import deploy from "../test/deploy";

(async () => {
  await deploy();
  await sync();
})();
