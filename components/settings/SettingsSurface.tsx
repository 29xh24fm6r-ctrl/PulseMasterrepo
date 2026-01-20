"use client";

import { useState } from "react";
import { SettingsSection } from "./SettingsSection";
import { SettingRow } from "./SettingRow";

export function SettingsSurface() {
    // Stub Local State
    const [privacySensitive, setPrivacySensitive] = useState(true);
    const [privacyTelemetry, setPrivacyTelemetry] = useState(false);
    const [notifyAllow, setNotifyAllow] = useState(true);
    const [notifyQuiet, setNotifyQuiet] = useState(true);
    const [autoExplain, setAutoExplain] = useState(false);
    const [showQuietIndicator, setShowQuietIndicator] = useState(true);

    import { SectionHeader } from "@/components/ui/SectionHeader";

    return (
        <div className="max-w-2xl mx-auto p-6 lg:p-12 pb-32">
            <SectionHeader
                title="Settings"
                subtitle="Manage your Pulse experience."
                className="mb-12"
            />

            {/* 1. Account */}
            <SettingsSection title="Account">
                <SettingRow label="Email" value="user@example.com" type="text" />
                <SettingRow label="User ID" value="usr_12345678" type="text" />
                <SettingRow
                    label="Subscription"
                    value="Plus"
                    type="link"
                    href="/billing"
                    actionLabel="Manage subscription"
                />
            </SettingsSection>

            {/* 2. Privacy */}
            <SettingsSection title="Privacy">
                <SettingRow
                    label="Hide sensitive details"
                    description="Obfuscate private data when sharing screens."
                    type="toggle"
                    value={privacySensitive}
                    onChange={setPrivacySensitive}
                />
                <SettingRow
                    label="Allow telemetry"
                    description="Share anonymous usage data to improve Pulse."
                    type="toggle"
                    value={privacyTelemetry}
                    onChange={setPrivacyTelemetry}
                />
            </SettingsSection>

            {/* 3. Notifications */}
            <SettingsSection title="Notifications">
                <SettingRow
                    label="Allow notifications"
                    type="toggle"
                    value={notifyAllow}
                    onChange={setNotifyAllow}
                />
                <SettingRow
                    label="Quiet mode respect"
                    description="Silence notifications when energy state is Low."
                    type="toggle"
                    value={notifyQuiet}
                    onChange={setNotifyQuiet}
                />
            </SettingsSection>

            {/* 4. Autonomy Visibility */}
            <SettingsSection title="Autonomy Visibility">
                <SettingRow
                    label="Automatic explanations"
                    description="Pulse will proactively explain complex decisions."
                    type="toggle"
                    value={autoExplain}
                    onChange={setAutoExplain}
                />
                <SettingRow
                    label="Show status indicators"
                    description="Display visual indicators for active coordination modes."
                    type="toggle"
                    value={showQuietIndicator}
                    onChange={setShowQuietIndicator}
                />
            </SettingsSection>

            <div className="mt-8 flex justify-center">
                <button className="text-sm text-zinc-500 hover:text-red-600 transition-colors">
                    Sign out
                </button>
            </div>

        </div>
    );
}
