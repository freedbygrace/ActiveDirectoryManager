import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import RuleEditor from "@/components/dynamic-groups/rule-editor";

interface DynamicGroupRuleModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  ruleId?: number;
  onSuccess?: () => void;
}

export default function DynamicGroupRuleModal({
  isOpen,
  onOpenChange,
  ruleId,
  onSuccess,
}: DynamicGroupRuleModalProps) {
  const handleCancel = () => {
    onOpenChange(false);
  };

  const handleSuccess = () => {
    if (onSuccess) onSuccess();
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{ruleId ? "Edit" : "Create"} Dynamic Group Rule</DialogTitle>
          <DialogDescription>
            {ruleId
              ? "Modify the existing dynamic group membership rule"
              : "Create a new rule to automatically manage group memberships"}
          </DialogDescription>
        </DialogHeader>
        <RuleEditor
          ruleId={ruleId}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </DialogContent>
    </Dialog>
  );
}