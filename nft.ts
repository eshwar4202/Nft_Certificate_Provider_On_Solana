import {
  createNft,
  findMetadataPda,
  mplTokenMetadata,
  verifyCollectionV1,
} from "@metaplex-foundation/mpl-token-metadata";
import { base64 } from '@metaplex-foundation/umi/serializers';
import {
  createGenericFile,
  generateSigner,
  keypairIdentity,
  percentAmount,
  publicKey as UMIPublicKey,
} from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys";
import {
  airdropIfRequired,
  getKeypairFromFile,
} from "@solana-developers/helpers";
import { clusterApiUrl, Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { PublicKey } from "@solana/web3.js";
import sharp from "sharp";
import { signerIdentity, none } from "@metaplex-foundation/umi";
import { publicKey, type Signer } from "@metaplex-foundation/umi";


export async function mintNft(ownerid: string, svgstr: string, pubkey: string) {
  try {
    // Validate inputs
    if (!ownerid || !svgstr) {
      throw new Error("Invalid input: ownerid and svgstr are required");
    }

    const owner = new PublicKey(ownerid);
    const ownerAddress = pubkey;
    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

    // Load keypair from local file system
    const user = await getKeypairFromFile();
    console.log("Loaded user:", user.publicKey.toBase58());

    // Ensure the user has enough SOL
    await airdropIfRequired(
      connection,
      user.publicKey,
      1 * LAMPORTS_PER_SOL,
      0.1 * LAMPORTS_PER_SOL,
    );

    // Initialize UMI
    const umi = createUmi(connection);
    const dummySigner: Signer = {
      publicKey: publicKey(ownerAddress), // Replace with the wallet public key
      signMessage: async (message: Uint8Array) => {
        throw new Error("Dummy signer cannot sign messages");
      },
      signTransaction: async () => {
        throw new Error("Dummy signer cannot sign transactions");
      },
      signAllTransactions: async () => {
        throw new Error("Dummy signer cannot sign transactions");
      },
    };

    // Create UMI keypair from Solana keypair
    //const umiKeypair = umi.eddsa.createKeypairFromSecretKey(user.secretKey);
    //

    // Apply plugins to UMI
    umi.use(signerIdentity(none()))
      .use(mplTokenMetadata())
      .use(irysUploader());

    // Collection NFT address
    const collectionNftAddress = UMIPublicKey("4GDeLZGnNkSkM9hzMARMS2EoFeKacUeXBuXUSVMXrfpD");

    // Convert SVG to PNG buffer
    const buffer = await sharp(Buffer.from(svgstr))
      .flatten({ background: "#ffffff" })
      .png()
      .toBuffer();

    // Create generic file for upload
    const file = createGenericFile(buffer, "nft.png", {
      contentType: "image/png",
    });

    // Upload image and get image URI
    const [image] = await umi.uploader.upload([file]);
    console.log("Image URI:", image);

    // Upload off-chain JSON metadata
    const uri = await umi.uploader.uploadJson({
      name: "My NFT",
      symbol: "MN",
      description: "My NFT Description",
      image,
    });
    console.log("NFT off-chain metadata URI:", uri);

    // Generate mint keypair
    const mint = generateSigner(umi);

    // Create and mint NFT
    const builder = await createNft(umi, {
      mint,
      name: "My NFT",
      symbol: "MN",
      uri,
      updateAuthority: umi.identity.publicKey,
      sellerFeeBasisPoints: percentAmount(0),
      collection: {
        key: collectionNftAddress,
        verified: false,
      },
    });

    // Build and serialize transaction
    const tx = await builder.buildWithLatestBlockhash(umi);
    const serializedTx = Buffer.from(umi.transactions.serialize(tx)).toString("base64");
    console.log("Serialized transaction:", serializedTx);

    return {
      transaction: serializedTx,
      mint: mint.publicKey.toString(),
    };
  } catch (error) {
    console.error("Error minting NFT:", error);
    throw new Error(`Failed to mint NFT: ${error.message}`);
  }
}
