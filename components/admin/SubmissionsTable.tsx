"use client"

import { useState } from "react"
import type { ExamSubmission } from "@/lib/storage"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"

interface SubmissionsTableProps {
	submissions: ExamSubmission[]
}

export default function SubmissionsTable({ submissions }: SubmissionsTableProps) {
	const [open, setOpen] = useState(false)
	const [selected, setSelected] = useState<ExamSubmission | null>(null)

	const openLogs = (submission: ExamSubmission) => {
		setSelected(submission)
		setOpen(true)
	}

	return (
		<Card>
			<div className="p-4 overflow-x-auto">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Time</TableHead>
							<TableHead>Student</TableHead>
							<TableHead>Score</TableHead>
							<TableHead>Warnings</TableHead>
							<TableHead>Fullscreen Exits</TableHead>
							<TableHead>Logs</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{submissions.map((s) => (
							<TableRow key={s.id}>
								<TableCell className="whitespace-nowrap">{new Date(s.timestampIso).toLocaleString()}</TableCell>
								<TableCell>{s.studentName}</TableCell>
								<TableCell>{s.score}/{s.totalQuestions}</TableCell>
								<TableCell>{s.warningCount}</TableCell>
								<TableCell>{s.fullscreenExits}</TableCell>
								<TableCell>
									<Button variant="outline" size="sm" onClick={() => openLogs(s)}>
										View logs {s.cheatingLogs?.length ? `(${s.cheatingLogs.length})` : ""}
									</Button>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="sm:max-w-2xl">
					<DialogHeader>
						<DialogTitle>Suspicious activity logs</DialogTitle>
						<DialogDescription>
							{submittedMeta(selected)}
						</DialogDescription>
					</DialogHeader>
					<ScrollArea className="max-h-[320px] pr-4">
						<div className="space-y-2 text-sm">
							{selected?.cheatingLogs?.length ? (
								selected.cheatingLogs.map((log, idx) => (
									<div key={idx} className="text-muted-foreground">
										{log}
									</div>
								))
							) : (
								<div className="text-muted-foreground">No suspicious activity</div>
							)}
						</div>
					</ScrollArea>
					<DialogFooter>
						<Button onClick={() => setOpen(false)}>Close</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</Card>
	)
}

function submittedMeta(s: ExamSubmission | null) {
	if (!s) return null
	return (
		<div className="text-xs text-muted-foreground">
			<span className="font-medium">{s.studentName}</span> 
			<span className="mx-1">•</span> 
			<span>{new Date(s.timestampIso).toLocaleString()}</span>
			<span className="mx-1">•</span>
			<span>Warnings: {s.warningCount}</span>
		</div>
	)
} 