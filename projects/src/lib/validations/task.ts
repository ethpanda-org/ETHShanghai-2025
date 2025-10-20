import { z } from "zod";

export const taskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(10, { message: "标题至少需要 10 个字符" })
    .max(100, { message: "标题不能超过 100 个字符" }),
  description: z
    .string()
    .trim()
    .min(50, { message: "详细描述至少需要 50 个字符" })
    .max(2000, { message: "详细描述不能超过 2000 个字符" }),
  githubLink: z
    .string()
    .trim()
    .url({ message: "请输入有效的 URL" })
    .optional()
    .or(z.literal("")),
  lovableLink: z
    .string()
    .trim()
    .url({ message: "请输入有效的 URL" })
    .optional()
    .or(z.literal("")),
  budget: z
    .string()
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: "预算必须大于 0",
    })
    .refine((val) => parseFloat(val) >= 0.001, {
      message: "最低预算为 0.001 ETH",
    })
    .refine((val) => parseFloat(val) <= 10, {
      message: "单个任务预算不能超过 10 ETH",
    }),
  urgency: z.enum(["low", "medium", "high"], {
    required_error: "请选择紧急程度",
  }),
});

export type TaskFormData = z.infer<typeof taskSchema>;
