import { MEMBERS, type Member } from "@/lib/gateData";
import { cn } from "@/lib/utils";

const memberColors: Record<Member, string> = {
  Bhavesh: "bg-person1 text-primary-foreground",
  Avani: "bg-person2 text-primary-foreground",
  Akshita: "bg-person3 text-accent-foreground",
};

const memberColorsInactive: Record<Member, string> = {
  Bhavesh: "border-person1 text-person1 hover:bg-person1/10",
  Avani: "border-person2 text-person2 hover:bg-person2/10",
  Akshita: "border-person3 text-person3 hover:bg-person3/10",
};

interface Props {
  current: Member;
  onChange: (m: Member) => void;
}

export default function MemberSelector({ current, onChange }: Props) {
  return (
    <div className="flex gap-2">
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
