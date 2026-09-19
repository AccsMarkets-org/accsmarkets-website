interface Props {
  code: string;
  className?: string;
}

export function CountryFlag({ code, className }: Props) {
  const lower = code.toLowerCase();
  return (
    <img
      src={`https://flagcdn.com/20x15/${lower}.png`}
      srcSet={`https://flagcdn.com/40x30/${lower}.png 2x`}
      width={20}
      height={15}
      alt={code}
      className={className}
      style={{ display: "inline-block", verticalAlign: "middle" }}
    />
  );
}
