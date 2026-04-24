"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, XCircle, RefreshCw, ExternalLink, BookOpen, Sparkles } from "lucide-react";

interface UsedSource {
  content_preview: string;
  relevance_reason: string;
}

interface GeneratedEmail {
  id: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  status: "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "SENT";
  qualityScore: number;
  copyFrameworkUsed: string;
  rationale: string;
  usedSources: UsedSource[];
  personalizationHooks: string[];
  createdAt: string;
}

export default function EmailReviewPage() {
  const params = useParams();
  const router = useRouter();
  const emailId = params.id as string;

  const [email, setEmail] = useState<GeneratedEmail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchEmail();
  }, [emailId]);

  const fetchEmail = async () => {
    try {
      const response = await fetch(`/api/emails/${emailId}`);
      if (!response.ok) throw new Error("Failed to fetch email");
      const data = await response.json();
      setEmail(data.email);
    } catch (error) {
      console.error("Error fetching email:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/emails/${emailId}/approve`, {
        method: "POST",
      });
      if (response.ok) {
        router.push("/emails");
      }
    } catch (error) {
      console.error("Error approving email:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/emails/${emailId}/reject`, {
        method: "POST",
      });
      if (response.ok) {
        router.push("/emails");
      }
    } catch (error) {
      console.error("Error rejecting email:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRegenerate = async () => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/emails/${emailId}/regenerate`, {
        method: "POST",
      });
      if (response.ok) {
        // Refresh to get new email data
        fetchEmail();
      }
    } catch (error) {
      console.error("Error regenerating email:", error);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!email) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Email not found</p>
      </div>
    );
  }

  const qualityColor =
    email.qualityScore >= 0.8 ? "bg-green-500" :
    email.qualityScore >= 0.6 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main email content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Email Review</CardTitle>
                <Badge
                  variant={email.status === "PENDING_REVIEW" ? "outline" : "default"}
                >
                  {email.status.replace("_", " ")}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Email preview */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Subject
                </label>
                <p className="text-lg font-medium">{email.subject}</p>
              </div>

              <Separator />

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Body
                </label>
                <div
                  className="prose prose-sm max-w-none bg-muted p-4 rounded-lg"
                  dangerouslySetInnerHTML={{ __html: email.bodyHtml }}
                />
              </div>

              {/* Actions */}
              {email.status === "PENDING_REVIEW" && (
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleApprove}
                    disabled={actionLoading}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve ✓
                  </Button>
                  <Button
                    onClick={handleReject}
                    disabled={actionLoading}
                    variant="destructive"
                    className="flex-1"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject ✗
                  </Button>
                  <Button
                    onClick={handleRegenerate}
                    disabled={actionLoading}
                    variant="outline"
                    className="flex-1"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Regenerate ↺
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Context panel */}
        <div className="space-y-6">
          {/* Quality Score */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Quality Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">
                    {Math.round(email.qualityScore * 100)}%
                  </span>
                  <Sparkles className="w-5 h-5 text-yellow-500" />
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${qualityColor} transition-all`}
                    style={{ width: `${email.qualityScore * 100}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Framework & Rationale */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Generation Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground">
                  Copy Framework
                </label>
                <p className="font-medium">{email.copyFrameworkUsed}</p>
              </div>
              <Separator />
              <div>
                <label className="text-xs text-muted-foreground">
                  Rationale
                </label>
                <p className="text-sm text-muted-foreground mt-1">
                  {email.rationale}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Used Sources */}
          {email.usedSources && email.usedSources.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Context Used
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {email.usedSources.map((source, index) => (
                  <div key={index} className="space-y-2">
                    <div className="bg-muted p-3 rounded text-sm">
                      <p className="line-clamp-3">{source.content_preview}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium">Why relevant: </span>
                      {source.relevance_reason}
                    </p>
                    {index < email.usedSources.length - 1 && <Separator />}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Personalization Hooks */}
          {email.personalizationHooks && email.personalizationHooks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Personalization Hooks</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {email.personalizationHooks.map((hook, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 text-sm"
                    >
                      <span className="text-primary">•</span>
                      {hook}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
