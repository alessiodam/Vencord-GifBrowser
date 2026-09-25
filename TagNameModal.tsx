/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { RenderModalProps } from "@vencord/discord-types";
import { Forms, Modal, openModal, React, TextInput } from "@webpack/common";
import { KeyboardEvent } from "react";

interface TagNameModalProps {
    modalProps: RenderModalProps;
    title: string;
    initialValue?: string;
    onSubmit(name: string): void;
}

function TagNameModal({ modalProps, title, initialValue = "", onSubmit }: TagNameModalProps) {
    const [value, setValue] = React.useState(initialValue);

    function submit() {
        if (!value.trim()) return;
        onSubmit(value.trim());
        modalProps.onClose();
    }

    return (
        <Modal
            {...modalProps}
            title={title}
            actions={[
                {
                    text: "Cancel",
                    variant: "secondary",
                    onClick: () => modalProps.onClose()
                },
                {
                    text: "Save",
                    variant: "primary",
                    onClick: submit
                }
            ]}
        >
            <Forms.FormTitle tag="h5">Tag name</Forms.FormTitle>
            <TextInput
                autoFocus
                placeholder="reactions, cats, cursed..."
                value={value}
                onChange={setValue}
                onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === "Enter") submit();
                }}
            />
        </Modal>
    );
}

export function openTagNameModal(title: string, onSubmit: (name: string) => void, initialValue?: string) {
    openModal(modalProps => (
        <TagNameModal
            modalProps={modalProps}
            title={title}
            initialValue={initialValue}
            onSubmit={onSubmit}
        />
    ));
}
