import { PlaceholderPage } from "@/components/shared/PlaceholderPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ניהול נכסים | DirApp",
  description: "ניהול מודעות הדירה והנכסים שברשותך",
};

export default function PropertiesPage() {
  return (
    <PlaceholderPage
      title="ניהול נכסים"
      description="כאן תוכל לראות את רשימת הדירות שברשותך, להוסיף מודעות חדשות לשוק, או לערוך, להשהות ולשווק מודעות קיימות."
      icon="apartment"
    />
  );
}
