/** Simple QR via public encoder (no extra npm dep). */
export function TonAddressQr({ address, size = 180 }: { address: string; size?: number }) {
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=8&data=${encodeURIComponent(address)}`;
  return (
    <div className="crypto-qr-wrap">
      <img
        className="crypto-qr"
        src={src}
        width={size}
        height={size}
        alt="QR"
        loading="lazy"
        decoding="async"
      />
    </div>
  );
}
