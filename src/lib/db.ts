import { supabase } from "./supabase";
import type { Rubric, RubricInput, Submission, SubmissionInput } from "./types";

export async function listRubrics(uid: string): Promise<Rubric[]> {
  const { data, error } = await supabase().from("rubrics").select("*").eq("user_id", uid).order("updatedAt", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
export async function getRubric(uid: string, id: string): Promise<Rubric | null> {
  const { data, error } = await supabase().from("rubrics").select("*").eq("user_id", uid).eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}
export async function createRubric(uid: string, input: RubricInput): Promise<string> {
  const { data, error } = await supabase().from("rubrics").insert({ title: input.title, taskDescription: input.taskDescription, criteria: input.criteria, user_id: uid }).select("id").single();
  if (error) throw error;
  return data.id;
}
export async function updateRubric(uid: string, id: string, input: RubricInput): Promise<void> {
  const { error } = await supabase().from("rubrics").update({ title: input.title, taskDescription: input.taskDescription, criteria: input.criteria }).eq("user_id", uid).eq("id", id).select("id").single();
  if (error) throw error;
}
export async function deleteRubric(uid: string, id: string): Promise<void> {
  const { error } = await supabase().from("rubrics").delete().eq("user_id", uid).eq("id", id).select("id").single();
  if (error) throw error;
}
export async function listSubmissions(uid: string): Promise<Submission[]> {
  const { data, error } = await supabase().from("submissions").select("*").eq("user_id", uid).order("createdAt", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
export async function getSubmission(uid: string, id: string): Promise<Submission | null> {
  const { data, error } = await supabase().from("submissions").select("*").eq("user_id", uid).eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}
function submissionFields(input: Partial<SubmissionInput>) {
  return Object.fromEntries(["rubricId", "rubricTitle", "studentName", "studentId", "fileName", "extractedText", "evaluation"].filter(key => key in input).map(key => [key, input[key as keyof SubmissionInput]]));
}
export async function createSubmission(uid: string, input: SubmissionInput): Promise<string> {
  const { data, error } = await supabase().from("submissions").insert({ ...submissionFields(input), user_id: uid }).select("id").single();
  if (error) throw error;
  return data.id;
}
export async function updateSubmission(uid: string, id: string, input: Partial<SubmissionInput>): Promise<void> {
  const { error } = await supabase().from("submissions").update(submissionFields(input)).eq("user_id", uid).eq("id", id).select("id").single();
  if (error) throw error;
}
export async function deleteSubmission(uid: string, id: string): Promise<void> {
  const { error } = await supabase().from("submissions").delete().eq("user_id", uid).eq("id", id).select("id").single();
  if (error) throw error;
}
