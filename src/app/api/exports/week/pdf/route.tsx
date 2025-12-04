// src/app/api/exports/week/pdf/route.tsx
import { NextRequest, NextResponse } from "next/server";
import {
  pdf,
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

import { prisma } from "@/lib/prisma";
import { getWeekRange, formatDuration } from "@/lib/time";
import { getCurrentUserEmail } from "@/lib/server-auth";
import type { Prisma } from "@prisma/client";

// Add a type for the included relation
type SessionWithProject = Prisma.SessionGetPayload<{
  include: { project: true };
}>;

type SummaryMode = "self" | "manager" | "client";

const styles = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingBottom: 40,
    paddingHorizontal: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#111827",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: "column",
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: "#4B5563",
  },
  headerRight: {
    flexDirection: "column",
    alignItems: "flex-end",
    fontSize: 9,
  },
  headerLabel: {
    fontSize: 8,
    color: "#6B7280",
  },
  headerValue: {
    fontSize: 9,
    marginBottom: 2,
  },
  section: {
    marginTop: 12,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 6,
  },
  paragraph: {
    fontSize: 10,
    lineHeight: 1.4,
    color: "#111827",
  },
  metricsRow: {
    flexDirection: "row",
    marginTop: 4,
  },
  metricCard: {
    flexGrow: 1,
    flexBasis: 0,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginRight: 8,
  },
  metricCardLast: {
    marginRight: 0,
  },
  metricLabel: {
    fontSize: 8,
    color: "#6B7280",
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 12,
    fontWeight: "bold",
  },
  table: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 4,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  tableHeaderRow: {
    backgroundColor: "#F3F4F6",
  },
  tableCell: {
    flex: 1,
    paddingVertical: 4,
    paddingHorizontal: 6,
    fontSize: 9,
    borderRightWidth: 1,
    borderRightColor: "#E5E7EB",
  },
  tableCellWide: {
    flex: 3,
  },
  tableCellLast: {
    borderRightWidth: 0,
  },
  tableHeaderCell: {
    fontWeight: "bold",
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#9CA3AF",
    textAlign: "right",
  },
});

type ProjectTotalForPdf = {
  id: number;
  name: string;
  totalMs: number;
  count: number;
  percentageOfWeek: number;
};

type WeeklySummaryPdfProps = {
  mode: SummaryMode;
  ownerEmail: string;
  clientName?: string;
  weekStartLabel: string;
  weekEndLabel: string;
  totalMs: number;
  sessionsCount: number;
  activeProjectsCount: number;
  highlightText: string;
  projectTotals: ProjectTotalForPdf[];
};

const WeeklySummaryPdf = ({
  mode,
  ownerEmail,
  clientName,
  weekStartLabel,
  weekEndLabel,
  totalMs,
  sessionsCount,
  activeProjectsCount,
  highlightText,
  projectTotals,
}: WeeklySummaryPdfProps) => {
  const title =
    mode === "client"
      ? "Weekly client update"
      : mode === "manager"
      ? "Weekly update"
      : "Weekly dev log";

  const subtitle = `${weekStartLabel} – ${weekEndLabel}`;

  const summaryLabelTime =
    mode === "client" ? "Total tracked time" : "Total time";
  const summaryLabelBlocks = mode === "client" ? "Work blocks" : "Sessions";

  const projectHeading =
    mode === "client"
      ? "Projects & deliverables"
      : mode === "manager"
      ? "Projects worked on"
      : "By project";

  const generatedOn = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.headerLabel}>Prepared by</Text>
            <Text style={styles.headerValue}>{ownerEmail}</Text>
            {clientName ? (
              <>
                <Text style={styles.headerLabel}>Client</Text>
                <Text style={styles.headerValue}>{clientName}</Text>
              </>
            ) : null}
          </View>
        </View>

        {/* Highlight */}
        {highlightText ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Weekly highlight</Text>
            <Text style={styles.paragraph}>{highlightText}</Text>
          </View>
        ) : null}

        {/* Summary metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>{summaryLabelTime}</Text>
              <Text style={styles.metricValue}>{formatDuration(totalMs)}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>{summaryLabelBlocks}</Text>
              <Text style={styles.metricValue}>{sessionsCount}</Text>
            </View>
            <View style={[styles.metricCard, styles.metricCardLast]}>
              <Text style={styles.metricLabel}>Projects</Text>
              <Text style={styles.metricValue}>{activeProjectsCount}</Text>
            </View>
          </View>
        </View>

        {/* Project breakdown table */}
        {projectTotals.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{projectHeading}</Text>
            <View style={styles.table}>
              {/* Header row */}
              <View style={[styles.tableRow, styles.tableHeaderRow]}>
                <Text
                  style={[
                    styles.tableCell,
                    styles.tableCellWide,
                    styles.tableHeaderCell,
                  ]}
                >
                  Project
                </Text>
                <Text style={[styles.tableCell, styles.tableHeaderCell]}>
                  Time
                </Text>
                <Text style={[styles.tableCell, styles.tableHeaderCell]}>
                  Share
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    styles.tableCellLast,
                    styles.tableHeaderCell,
                  ]}
                >
                  Blocks
                </Text>
              </View>

              {/* Data rows */}
              {/* Data rows */}
              {projectTotals.map((p, index) => {
                const isLast = index === projectTotals.length - 1;

                const rowStyle = isLast
                  ? [styles.tableRow, styles.tableRowLast]
                  : [styles.tableRow];

                return (
                  <View key={p.id} style={rowStyle}>
                    <Text style={[styles.tableCell, styles.tableCellWide]}>
                      {p.name}
                    </Text>
                    <Text style={styles.tableCell}>
                      {formatDuration(p.totalMs)}
                    </Text>
                    <Text style={styles.tableCell}>{p.percentageOfWeek}%</Text>
                    <Text style={[styles.tableCell, styles.tableCellLast]}>
                      {p.count}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Generated from Dev Workflow Focus Tracker · {generatedOn}</Text>
        </View>
      </Page>
    </Document>
  );
};

export async function GET(req: NextRequest) {
  const ownerEmail = await getCurrentUserEmail();
  if (!ownerEmail) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(req.url);

  const rawOffset = searchParams.get("offset");
  const rawMode = searchParams.get("mode");
  const rawProjectId = searchParams.get("projectId");
  const clientName = searchParams.get("client") || undefined;

  const weekOffset = rawOffset ? Number(rawOffset) || 0 : 0;

  let mode: SummaryMode;
  if (rawMode === "manager") {
    mode = "manager";
  } else if (rawMode === "client") {
    mode = "client";
  } else {
    mode = "self";
  }

  const projectFilterId =
    rawProjectId && !Number.isNaN(Number(rawProjectId))
      ? Number(rawProjectId)
      : null;

  const { start, end } = getWeekRange(weekOffset);

  const sessionWhere: Prisma.SessionWhereInput = {
    ownerEmail,
    startTime: {
      gte: start,
      lt: end,
    },
  };
  if (projectFilterId !== null) {
    sessionWhere.projectId = projectFilterId;
  }

  const [sessions, weeklyHighlight]: [
    SessionWithProject[],
    Awaited<ReturnType<typeof prisma.weeklyHighlight.findUnique>>
  ] = await Promise.all([
    prisma.session.findMany({
      where: sessionWhere,
      include: { project: true },
      orderBy: { startTime: "asc" },
    }),
    prisma.weeklyHighlight.findUnique({
      where: {
        ownerEmail_weekStart: {
          ownerEmail,
          weekStart: start,
        },
      },
    }),
  ]);

  const highlightText = weeklyHighlight?.highlight ?? "";
  const totalMs = sessions.reduce((acc, s) => acc + s.durationMs, 0);
  const sessionsCount = sessions.length;

  const projectTotals = sessions.reduce<
    Record<number, { name: string; totalMs: number; count: number }>
  >((acc, s) => {
    // Guard sessions without a projectId
    if (s.projectId == null) return acc;

    if (!acc[s.projectId]) {
      acc[s.projectId] = {
        name: s.project?.name ?? "",
        totalMs: 0,
        count: 0,
      };
    }
    acc[s.projectId].totalMs += s.durationMs;
    acc[s.projectId].count += 1;
    return acc;
  }, {});

  const projectTotalsArray = Object.entries(projectTotals).map(
    ([id, value]) => ({
      id: Number(id),
      ...value,
    })
  );

  const activeProjectsCount = projectTotalsArray.length;

  const projectTotalsForPdf: ProjectTotalForPdf[] = projectTotalsArray
    .sort((a, b) => b.totalMs - a.totalMs)
    .map((p) => ({
      id: p.id,
      name: p.name,
      totalMs: p.totalMs,
      count: p.count,
      percentageOfWeek:
        totalMs > 0 ? Math.round((p.totalMs / totalMs) * 100) : 0,
    }));

  const weekStartLabel = start.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const lastDay = new Date(end);
  lastDay.setDate(end.getDate() - 1);
  const weekEndLabel = lastDay.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const pdfInstance = pdf(
    <WeeklySummaryPdf
      mode={mode}
      ownerEmail={ownerEmail}
      clientName={clientName}
      weekStartLabel={weekStartLabel}
      weekEndLabel={weekEndLabel}
      totalMs={totalMs}
      sessionsCount={sessionsCount}
      activeProjectsCount={activeProjectsCount}
      highlightText={highlightText}
      projectTotals={projectTotalsForPdf}
    />
  );

  // Use Blob instead of Buffer to satisfy BodyInit
  const pdfBlob = await pdfInstance.toBlob();

  const filenameBase =
    mode === "client"
      ? "weekly-client-update"
      : mode === "manager"
      ? "weekly-update"
      : "weekly-dev-log";

  const safeStart = weekStartLabel.replace(/[^a-zA-Z0-9]/g, "-");
  const safeEnd = weekEndLabel.replace(/[^a-zA-Z0-9]/g, "-");

  const fileName = `${filenameBase}-${safeStart}-to-${safeEnd}.pdf`;

  return new NextResponse(pdfBlob, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
