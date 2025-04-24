import { Check, ChevronDown } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { cn } from "~/lib/utils";

export interface Scenario {
  description: string;
  prompt: string;
}

interface ScenarioDropdownProps {
  scenarios: Scenario[];
  selectedScenario: Scenario | null;
  onSelect: (scenario: Scenario) => void;
  className?: string;
}

export function ScenarioDropdown({
  scenarios,
  selectedScenario,
  onSelect,
  className,
}: ScenarioDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "flex w-full justify-between gap-2 px-4 py-6 text-left font-normal",
            className
          )}
        >
          {selectedScenario ? (
            <div className="flex flex-col overflow-hidden">
              <span className="font-medium truncate">{selectedScenario.description}</span>
              <span className="text-sm text-muted-foreground truncate">
                {selectedScenario.prompt}
              </span>
            </div>
          ) : (
            <span>Select a scenario...</span>
          )}
          <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="max-h-[350px] w-[400px] overflow-auto">
        {scenarios.map((scenario, index) => (
          <DropdownMenuItem
            key={index}
            className={cn(
              "flex cursor-pointer flex-col items-start py-3",
              selectedScenario?.description === scenario.description &&
                "bg-accent"
            )}
            onClick={() => onSelect(scenario)}
          >
            <div className="flex w-full items-start justify-between">
              <span className="font-medium break-words pr-4">{scenario.description}</span>
              {selectedScenario?.description === scenario.description && (
                <Check className="h-4 w-4 flex-shrink-0 mt-1" />
              )}
            </div>
            <span className="text-sm text-muted-foreground break-words">
              {scenario.prompt}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 