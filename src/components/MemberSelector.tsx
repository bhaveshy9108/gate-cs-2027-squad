import { MEMBERS, type Member } from "@/lib/gateData";
import { cn } from "@/lib/utils";

const memberColors: Record<Member, string> = {
  Bhavesh: "bg-person1 text-primary-foreground",
};

const memberColorsInactive: Record<Member, string> = {
  Bhavesh: "border-person1 text-person1 hover:bg-person1/10",
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
            "min-w-24 px-4 py-2 rounded-2xl font-semibold text-sm border-2 transition-all duration-200",
            current === m ? memberColors[m] + " border-transparent shadow-md scale-105" : memberColorsInactive[m]
          )}
        >
          {m === "Bhavesh" ? "You" : m}
        </button>
      ))}
    </div>
  );
}
