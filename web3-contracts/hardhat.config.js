import "@nomicfoundation/hardhat-toolbox";
import { config as dotenvConfig } from "dotenv";
dotenvConfig();

let pk = process.env.PRIVATE_KEY || "";
pk = pk.replace(/['"]/g, '').trim();
if (pk && !pk.startsWith("0x")) {
  pk = "0x" + pk;
}

/** @type import('hardhat/config').HardhatUserConfig */
export default {
  solidity: "0.8.20",
  networks: {
    hardhat: {
      chainId: 1337
    },
    amoy: {
      url: "https://rpc-amoy.polygon.technology/",
      accounts: pk.length >= 64 ? [pk] : [],
      chainId: 80002
    }
  }
};
