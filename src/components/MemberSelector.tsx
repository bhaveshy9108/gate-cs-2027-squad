import { MEMBERS, type Member } from "@/lib/gateData";
import { cn } from "@/lib/utils";

const memberColors: Record<Member, string> = {
  Bhavesh: "bg-person1 text-primary-foreground",
  Aryan: "bg-amber-500 text-white",
  Avani: "bg-pink-500 text-white",
  Akshita: "bg-emerald-500 text-white",
  Nayan: "bg-violet-500 text-white",
};

const memberColorsInactive: Record<Member, string> = {
  Bhavesh: "border-person1 text-person1 hover:bg-person1/10",
  Aryan: "border-amber-500 text-amber-600 hover:bg-amber-500/10",
  Avani: "border-pink-500 text-pink-600 hover:bg-pink-500/10",
  Akshita: "border-emerald-500 text-emerald-600 hover:bg-emerald-500/10",
  Nayan: "border-violet-500 text-violet-600 hover:bg-violet-500/10",
};

interface Props {
  current: Member;
  onChange: (m: Member) => void;
}

export default function MemberSelector({ current, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2 justify-end">
      {MEMBERS.map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          className={cn(
            "px-4 py-2 rounded-lg font-semibold text-sm border-2 transition-all",
            current === m ? memberColors[m] + " border-transparent shadow-md scale-105" : memberColorsInactive[m]
          )}
        >
          {m}
        </button>
      ))}
    </div>
  );
}
