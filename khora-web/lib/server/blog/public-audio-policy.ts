// Deployment invariant: schema1 has no verified public audio, preview or voice consent.
// Deliberately no environment switch. Replace only with reviewed asset-bound contract/tests.
export function assertPublicAudioContractReady():never {
 throw new Error('PUBLIC_AUDIO_CONTRACT_REQUIRED');
}
