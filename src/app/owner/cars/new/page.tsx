// Create listing (FR-32): starts PENDING for admin moderation (BR-02).
import { createCarAction } from "@/actions/cars";
import { ActionForm } from "@/components/action-form";
import { CarFormFields } from "@/components/car-form-fields";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "List a car" };

export default function NewCarPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>List a car</CardTitle>
          <p className="text-sm text-muted-foreground">New listings start as <strong>pending</strong> and appear publicly only after admin approval (BR-02).</p>
        </CardHeader>
        <CardContent>
          <ActionForm action={createCarAction} className="space-y-5">
            <CarFormFields />
            <SubmitButton className="bg-brand text-brand-foreground hover:bg-brand/90">Submit for moderation</SubmitButton>
          </ActionForm>
        </CardContent>
      </Card>
    </div>
  );
}
