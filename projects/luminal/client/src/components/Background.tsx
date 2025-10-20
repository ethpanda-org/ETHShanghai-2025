const ORBS = [
  { size: 320, top: "12%", left: "10%", color: "rgba(255,0,122,0.35)" },
  { size: 280, top: "58%", left: "20%", color: "rgba(64,186,255,0.35)" },
  { size: 260, top: "30%", left: "70%", color: "rgba(255,210,63,0.3)" },
  { size: 220, top: "72%", left: "68%", color: "rgba(159,43,255,0.35)" }
];

export function Background() {
  return (
    <div className="absolute inset-0 -z-10 bg-[#08090C]">
      <div className="absolute inset-0 bg-uniswap-glow opacity-70 blur-[120px]" />
      {ORBS.map((orb, index) => (
        <span
          key={index}
          className="absolute rounded-full"
          style={{
            width: `${orb.size}px`,
            height: `${orb.size}px`,
            top: orb.top,
            left: orb.left,
            background: `radial-gradient(circle, ${orb.color} 0%, rgba(0,0,0,0) 65%)`,
            filter: "blur(80px)",
            opacity: 0.7
          }}
        />
      ))}
    </div>
  );
}
