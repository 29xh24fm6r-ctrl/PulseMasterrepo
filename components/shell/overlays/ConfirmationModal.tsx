import { TOKENS } from "@/lib/ui/tokens";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { SecondaryButton } from "@/components/ui/SecondaryButton";
import { useOverlays } from "./OverlayContext";

export function ConfirmationModal() {
    const { confirmationActive, setConfirmationActive } = useOverlays();

    if (!confirmationActive) return null;

    return (
        <div className={`fixed inset-0 z-[40] flex items-center justify-center ${TOKENS.COLORS.glass.bg} ${TOKENS.BLUR.sm}`}>
            <div className={`${TOKENS.COLORS.glass.bg} border-white/10 border p-6 ${TOKENS.RADIUS.md} ${TOKENS.SHADOW.md} max-w-sm w-full mx-4`}>
                <h2 className={`text-xl font-semibold mb-2 ${TOKENS.COLORS.text.heading}`}>Confirmation</h2>
                <p className={`${TOKENS.COLORS.text.body} mb-6`}>Are you sure you want to proceed?</p>
                <div className="flex justify-end gap-3">
                    <SecondaryButton
                        onClick={() => setConfirmationActive(false)}
                    >
                        Cancel
                    </SecondaryButton>
                    <PrimaryButton
                        onClick={() => setConfirmationActive(false)}
                    >
                        Confirm
                    </PrimaryButton>
                </div>
            </div>
        </div>
    );
}
