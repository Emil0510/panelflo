export function Mascot() {
  return (
    <div className="mx-auto animate-auth-fade-up text-center opacity-0 [animation-delay:150ms]">
      <div
        className="relative mx-auto h-[72px] w-[72px] animate-mascot-bob rounded-full shadow-lg"
        style={{ background: "radial-gradient(circle at 35% 30%, #ffffff, #EBF2E8)" }}
      >
        <span className="absolute left-[22px] top-[30px] h-[7px] w-[7px] origin-center animate-mascot-blink rounded-full bg-[#2B5748]" />
        <span className="absolute left-[42px] top-[30px] h-[7px] w-[7px] origin-center animate-mascot-blink rounded-full bg-[#2B5748]" />
        <span className="absolute left-[27px] top-[38px] h-[9px] w-[18px] rounded-b-[18px] border-2 border-t-0 border-[#2B5748]" />
        <span className="absolute -right-2.5 -top-1.5 origin-[70%_70%] animate-mascot-wave text-xl">
          👋
        </span>
      </div>
      <div className="relative mt-2.5 inline-block rounded-lg bg-white px-3 py-2 text-xs font-semibold leading-snug text-[#16241d] shadow-sm before:absolute before:-top-1 before:left-1/2 before:h-0 before:w-0 before:-translate-x-1/2 before:border-x-[6px] before:border-b-[6px] before:border-x-transparent before:border-b-white">
        Hey there! Ready to run
        <br />
        your day?
      </div>
    </div>
  );
}
