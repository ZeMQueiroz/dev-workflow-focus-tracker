"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";

import {
  PROJECT_COLOR_KEYS,
  PROJECT_COLOR_LABELS,
  getProjectColorDotClass,
} from "@/lib/project-colors";

import { createProject } from "../app/actions/project-actions";
import { useFormStatus } from "react-dom";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type='submit'
      disabled={pending}
      className='bg-[var(--accent-solid)] text-[var(--text-on-accent)] hover:brightness-110 sm:w-fit'
    >
      {pending ? "Creating…" : "Create project"}
    </Button>
  );
}

export function CreateProjectDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size='sm'
          className='bg-[var(--accent-solid)] text-[var(--text-on-accent)] hover:brightness-95'
        >
          <Plus className='mr-1 h-4 w-4' />
          New project
        </Button>
      </DialogTrigger>

      <DialogContent className='border-[var(--border-subtle)] bg-[var(--bg-surface)] sm:max-w-md'>
        <DialogHeader>
          <DialogTitle className='text-[var(--text-primary)]'>
            New project
          </DialogTitle>
          <DialogDescription className='text-[var(--text-muted)]'>
            Create a project to group your focus sessions by client, product, or
            workstream.
          </DialogDescription>
        </DialogHeader>

        <form action={createProject} className='mt-2 space-y-5'>
          <div>
            <Label className='mb-1.5 block text-[0.7rem] font-medium uppercase tracking-wider text-[var(--text-muted)]'>
              Project name
            </Label>
            <Input
              name='name'
              required
              autoFocus
              placeholder='e.g. Client A — Backend'
              className='h-10 border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] text-sm text-[var(--text-primary)]'
            />
          </div>

          <div className='space-y-2'>
            <Label className='block text-[0.7rem] font-medium uppercase tracking-wider text-[var(--text-muted)]'>
              Color label
            </Label>

            <div className='grid grid-cols-3 gap-2'>
              {PROJECT_COLOR_KEYS.map((key) => (
                <label key={key} className='cursor-pointer'>
                  <input
                    type='radio'
                    name='color'
                    value={key}
                    defaultChecked={key === "slate"}
                    className='peer sr-only'
                  />
                  <div className='flex items-center gap-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] px-3 py-2.5 text-[0.75rem] text-[var(--text-muted)] transition-all peer-checked:border-[var(--accent-solid)] peer-checked:bg-[var(--accent-soft)] peer-checked:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'>
                    <span
                      className={`${getProjectColorDotClass(key)} ring-2 ring-transparent peer-checked:ring-[var(--accent-solid)]`}
                    />
                    <span className='truncate font-medium'>
                      {PROJECT_COLOR_LABELS[key]}
                    </span>
                  </div>
                </label>
              ))}
            </div>

            <p className='text-[0.65rem] text-[var(--text-muted)]'>
              Colors help you visually scan projects in timers and reports.
            </p>
          </div>

          <div className='flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end'>
            <Button
              type='button'
              variant='ghost'
              className='text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <SubmitButton />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
