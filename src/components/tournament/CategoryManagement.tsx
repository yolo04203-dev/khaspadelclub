import { useState } from "react";
import { Plus, Trash2, Tag, Users, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface TournamentCategory {
  id: string;
  name: string;
  description: string | null;
  max_teams: number;
  display_order: number;
  participantCount?: number;
}

interface CategoryManagementProps {
  categories: TournamentCategory[];
  tournamentStatus: string;
  onCreateCategory: (name: string, description: string, maxTeams: number) => Promise<void>;
  onUpdateCategory: (id: string, name: string, description: string, maxTeams: number) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
}

export function CategoryManagement({
  categories,
  tournamentStatus,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
}: CategoryManagementProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<TournamentCategory | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [maxTeams, setMaxTeams] = useState(8);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canEdit = tournamentStatus === "draft" || tournamentStatus === "registration";

  const openCreateDialog = () => {
    setEditingCategory(null);
    setName("");
    setDescription("");
    setMaxTeams(8);
    setIsDialogOpen(true);
  };

  const openEditDialog = (category: TournamentCategory) => {
    setEditingCategory(category);
    setName(category.name);
    setDescription(category.description || "");
    setMaxTeams(category.max_teams);
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      if (editingCategory) {
        await onUpdateCategory(editingCategory.id, name.trim(), description.trim(), maxTeams);
      } else {
        await onCreateCategory(name.trim(), description.trim(), maxTeams);
      }
      setIsDialogOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this category? All participants in this category will be unassigned.")) {
      await onDeleteCategory(id);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5" />
              Tournament Categories
            </CardTitle>
            <CardDescription>
              Each category has its own groups, matches, and knockout bracket
            </CardDescription>
          </div>
          {canEdit && (
            <Button size="sm" onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Add Category
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Tag className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No categories defined</p>
              <p className="text-sm mt-1">Add categories like "Men's", "Women's", "Mixed", etc.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Tag className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{category.name}</p>
                      {category.description && (
                        <p className="text-sm text-muted-foreground">{category.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {category.participantCount ?? 0}/{category.max_teams}
                    </Badge>
                    {canEdit && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(category)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(category.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Edit Category" : "Add Category"}
            </DialogTitle>
            <DialogDescription>
              Categories allow different divisions to compete separately within the same tournament.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="categoryName">Category Name</Label>
              <Input
                id="categoryName"
                placeholder="e.g., Men's, Women's, Mixed, Beginners"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="categoryDescription">Description (optional)</Label>
              <Input
                id="categoryDescription"
                placeholder="Brief description of this category"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="categoryMaxTeams">Max Teams</Label>
              <Input
                id="categoryMaxTeams"
                type="number"
                min={2}
                max={64}
                value={maxTeams}
                onChange={(e) => setMaxTeams(parseInt(e.target.value) || 8)}
              />
              <p className="text-xs text-muted-foreground">
                Maximum number of teams that can register in this category
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!name.trim() || isSubmitting}>
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin mr-2" />
              ) : null}
              {editingCategory ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
