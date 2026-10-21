import { getStepMetadata, sleep } from "workflow";
import { processTakeoutJobStep } from "@/lib/server/takeout/runtime";

async function boundedTakeoutStep(jobId: string) {
  "use step";
  return processTakeoutJobStep(jobId,getStepMetadata().attempt>=3);
}
boundedTakeoutStep.maxRetries = 2;

export async function takeoutImportWorkflow(jobId: string) {
  "use workflow";
  for (let i=0; i<1500; i++) {
    const result=await boundedTakeoutStep(jobId);
    if(result.done)return {jobId,status:result.status};
    if(result.busy)await sleep("5s");
  }
  throw new Error("TAKEOUT_STEP_LIMIT");
}
