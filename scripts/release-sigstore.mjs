import { bundleToJSON } from "@sigstore/bundle";
import {
  CIContextProvider,
  DEFAULT_FULCIO_URL,
  DEFAULT_REKOR_URL,
  DSSEBundleBuilder,
  FulcioSigner,
  RekorWitness,
} from "@sigstore/sign";

/** Tasks' keyless signing policy; the caller must fully verify the bundle. */
export async function attestWithRecovery(data, type) {
  const transport = { retry: { retries: 2 }, timeout: 5000 };
  const builder = new DSSEBundleBuilder({
    certificateChain: false,
    signer: new FulcioSigner({
      ...transport,
      fulcioBaseURL: DEFAULT_FULCIO_URL,
      identityProvider: new CIContextProvider("sigstore"),
    }),
    witnesses: [
      new RekorWitness({
        ...transport,
        rekorBaseURL: DEFAULT_REKOR_URL,
        entryType: "dsse",
        fetchOnConflict: true,
      }),
    ],
  });
  return bundleToJSON(await builder.create({ data, type }));
}
