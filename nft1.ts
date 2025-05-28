// See https://developers.metaplex.com/token-metadata
// and https://developers.metaplex.com/token-metadata/collections#associating-nfts-to-collection-nfts
import {
  createNft,
  fetchDigitalAsset,
  mplTokenMetadata,
} from "@metaplex-foundation/mpl-token-metadata";
import {
  airdropIfRequired,
  getExplorerLink,
  getKeypairFromFile,
} from "@solana-developers/helpers";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  generateSigner,
  keypairIdentity,
  createGenericFile,
  percentAmount,
  publicKey,
} from "@metaplex-foundation/umi";
import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  clusterApiUrl,
} from "@solana/web3.js";
import sharp from "sharp"


export async function mintNft(ownerid: string, svgstr: string) {

  const owner = new PublicKey(ownerid);

  // create a new connection to the cluster's API
  const connection = new Connection(clusterApiUrl("devnet"));

  // initialize a keypair for the user
  const user = await getKeypairFromFile();

  await airdropIfRequired(
    connection,
    user.publicKey,
    1 * LAMPORTS_PER_SOL,
    0.1 * LAMPORTS_PER_SOL
  );

  console.log("Loaded user:", user.publicKey.toBase58());

  // Create Umi Instance, using the same endpoint as our connection,
  // and using our user to sign transactions
  const umi = createUmi(connection.rpcEndpoint).use(mplTokenMetadata());
  const umiKeypair = umi.eddsa.createKeypairFromSecretKey(user.secretKey);
  umi.use(keypairIdentity(umiKeypair));

  // We could do
  //   const collectionAddress = new PublicKey();
  // to make a web.js PublicKey, and then use
  //   publicKey(collectionAddress)
  // to convert it to a Umi PublicKey
  // but we can also just make the a Umi publicKey directly
  // using the Umi publicKey() function
  const collectionAddress = publicKey("4GDeLZGnNkSkM9hzMARMS2EoFeKacUeXBuXUSVMXrfpD");

  const buff = await sharp(Buffer.from(svgstr)).png().toBuffer();

  let file = createGenericFile(buff, "nft.png", {
    contentType: "image/png",
  });

  // upload image and get image uri
  const [image] = await umi.uploader.upload([file]);
  console.log("image uri:", image);

  const uri = await umi.uploader.uploadJson({
    name: "My NFT",
    symbol: "MN",
    description: "My NFT Description",
    image,
  });
  console.log("NFT offchain metadata URI:", uri);


  // Generate an NFT
  console.log(`Creating NFT...`);
  const mint = generateSigner(umi);
  const transaction = await createNft(umi, {
    mint,
    name: "My NFT",
    // See https://developers.metaplex.com/token-metadata/token-standard#the-non-fungible-standard
    uri,
    sellerFeeBasisPoints: percentAmount(0),
    collection: {
      // See https://developers.metaplex.com/umi/public-keys-and-signers
      key: collectionAddress,
      verified: false,
    },
  });

  await transaction.sendAndConfirm(umi);

  const createdNft = await fetchDigitalAsset(umi, mint.publicKey);

  console.log(
    `✨🖼️ Created NFT! Address is: ${getExplorerLink(
      "address",
      createdNft.mint.publicKey,
      "devnet"
    )}`
  );

  console.log("✅ Finished successfully!");
}
