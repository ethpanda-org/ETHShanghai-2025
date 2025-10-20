// import chat from "@/api/requests/chat";
// import access from "@/api/requests/access";
// import stake from "@/api/requests/stake";
//
// export const API = {
//     ...chat,
//     ...access,
//     ...stake,
// }
// api/index.ts

// 自动导入
const modules = import.meta.glob("./requests/*.ts", { eager: true });
type ModuleExports = Record<string, any>;

let API: ModuleExports = {};

for (const path in modules) {
    const mod = modules[path] as { default?: ModuleExports };
    if (mod.default) {
        API = { ...API, ...mod.default };
    }
}

export { API };
