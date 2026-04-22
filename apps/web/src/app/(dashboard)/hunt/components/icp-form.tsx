"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";

interface ICPFormProps {
  onClose: () => void;
  onSubmit?: (data: ICPFormData) => void;
}

export interface ICPFormData {
  sector: string;
  targetRole: string;
  companySize?: string;
  location?: string;
  painPoints: string[];
  keywords: string[];
}

export function ICPForm({ onClose, onSubmit }: ICPFormProps) {
  const [formData, setFormData] = useState<ICPFormData>({
    sector: "",
    targetRole: "",
    companySize: "",
    location: "",
    painPoints: [],
    keywords: [],
  });

  const [newPainPoint, setNewPainPoint] = useState("");
  const [newKeyword, setNewKeyword] = useState("");

  const addPainPoint = () => {
    if (newPainPoint.trim()) {
      setFormData({ ...formData, painPoints: [...formData.painPoints, newPainPoint.trim()] });
      setNewPainPoint("");
    }
  };

  const removePainPoint = (index: number) => {
    setFormData({
      ...formData,
      painPoints: formData.painPoints.filter((_, i) => i !== index),
    });
  };

  const addKeyword = () => {
    if (newKeyword.trim()) {
      setFormData({ ...formData, keywords: [...formData.keywords, newKeyword.trim()] });
      setNewKeyword("");
    }
  };

  const removeKeyword = (index: number) => {
    setFormData({
      ...formData,
      keywords: formData.keywords.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.sector && formData.targetRole) {
      onSubmit?.(formData);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-lg mx-4">
        <CardHeader>
          <CardTitle>New Ideal Customer Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sector">Target Sector *</Label>
              <Input
                id="sector"
                placeholder="e.g., Clínicas dentales Madrid"
                value={formData.sector}
                onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetRole">Target Role *</Label>
              <Input
                id="targetRole"
                placeholder="e.g., Director, CEO, Gerente"
                value={formData.targetRole}
                onChange={(e) => setFormData({ ...formData, targetRole: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companySize">Company Size (optional)</Label>
                <Input
                  id="companySize"
                  placeholder="e.g., 10-50"
                  value={formData.companySize}
                  onChange={(e) => setFormData({ ...formData, companySize: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location (optional)</Label>
                <Input
                  id="location"
                  placeholder="e.g., Madrid, España"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Pain Points</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a pain point..."
                  value={newPainPoint}
                  onChange={(e) => setNewPainPoint(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addPainPoint())}
                />
                <Button type="button" variant="outline" onClick={addPainPoint}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.painPoints.map((point, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {point}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => removePainPoint(index)}
                    />
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Keywords</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a keyword..."
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addKeyword())}
                />
                <Button type="button" variant="outline" onClick={addKeyword}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.keywords.map((keyword, index) => (
                  <Badge key={index} variant="outline" className="flex items-center gap-1">
                    {keyword}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => removeKeyword(index)}
                    />
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">Create ICP</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
