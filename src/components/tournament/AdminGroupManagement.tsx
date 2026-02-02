import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Shuffle, Plus, Users, Trash2, Play } from "lucide-react";
import { toast } from "sonner";

interface Team {
  id: string;
  team_id: string;
  team_name: string;
  group_id: string | null;
}

interface Group {
  id: string;
  name: string;
  display_order: number;
}

interface AdminGroupManagementProps {
  groups: Group[];
  teams: Team[];
  onCreateGroup: (name: string) => Promise<void>;
  onDeleteGroup: (groupId: string) => Promise<void>;
  onAssignTeam: (teamId: string, groupId: string | null) => Promise<void>;
  onRandomAssign: () => Promise<void>;
  onGenerateGroupMatches: () => Promise<void>;
  canStartKnockout: boolean;
  onStartKnockout: () => Promise<void>;
}

export function AdminGroupManagement({
  groups,
  teams,
  onCreateGroup,
  onDeleteGroup,
  onAssignTeam,
  onRandomAssign,
  onGenerateGroupMatches,
  canStartKnockout,
  onStartKnockout,
}: AdminGroupManagementProps) {
  const [newGroupName, setNewGroupName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      toast.error("Please enter a group name");
      return;
    }
    setIsCreating(true);
    try {
      await onCreateGroup(newGroupName.trim());
      setNewGroupName("");
    } finally {
      setIsCreating(false);
    }
  };

  const unassignedTeams = teams.filter((t) => !t.group_id);
  const teamsPerGroup = groups.map((g) => ({
    ...g,
    teams: teams.filter((t) => t.group_id === g.id),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Group Management
        </CardTitle>
        <CardDescription>Create groups and assign teams</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Create Group */}
        <div className="flex gap-2">
          <Input
            placeholder="Group name (e.g., Group A)"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
          />
          <Button onClick={handleCreateGroup} disabled={isCreating}>
            <Plus className="w-4 h-4 mr-1" />
            Add Group
          </Button>
        </div>

        {/* Quick Actions */}
        {groups.length > 0 && unassignedTeams.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={onRandomAssign}>
              <Shuffle className="w-4 h-4 mr-2" />
              Random Draw
            </Button>
          </div>
        )}

        {/* Groups with teams */}
        <div className="grid gap-4 md:grid-cols-2">
          {teamsPerGroup.map((group) => (
            <Card key={group.id} className="border-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  {group.name}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive hover:text-destructive"
                    onClick={() => onDeleteGroup(group.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {group.teams.map((team) => (
                  <div
                    key={team.id}
                    className="flex items-center justify-between p-2 rounded bg-muted/50"
                  >
                    <span className="font-medium">{team.team_name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onAssignTeam(team.id, null)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                {group.teams.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    No teams assigned
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Unassigned Teams */}
        {unassignedTeams.length > 0 && (
          <div>
            <Label className="text-sm font-medium mb-2 block">
              Unassigned Teams ({unassignedTeams.length})
            </Label>
            <div className="space-y-2">
              {unassignedTeams.map((team) => (
                <div
                  key={team.id}
                  className="flex items-center justify-between p-2 rounded border"
                >
                  <span>{team.team_name}</span>
                  <Select
                    onValueChange={(value) => onAssignTeam(team.id, value)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Assign to..." />
                    </SelectTrigger>
                    <SelectContent>
                      {groups.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Generate Matches & Start Knockout */}
        {groups.length > 0 && unassignedTeams.length === 0 && (
          <div className="flex gap-2 flex-wrap pt-4 border-t">
            <Button onClick={onGenerateGroupMatches}>
              <Play className="w-4 h-4 mr-2" />
              Generate Group Matches
            </Button>
            {canStartKnockout && (
              <Button variant="default" onClick={onStartKnockout}>
                Start Knockout Stage
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
