import { processTakeoutJobStep } from "@/lib/server/takeout/runtime";

async function boundedTakeoutStep(jobId: string) {
  "use step";
  return processTakeoutJobStep(jobId);
}
boundedTakeoutStep.maxRetries = 2;

export async function takeoutImportWorkflow(jobId: string) {
  "use workflow";
  for (let i=0; i<1500; i++) {
    const result=await boundedTakeoutStep(jobId);
    if(result.done)return {jobId,status:result.status};
  }
  throw new Error("TAKEOUT_STEP_LIMIT");
}
