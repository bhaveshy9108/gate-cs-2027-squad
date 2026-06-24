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
