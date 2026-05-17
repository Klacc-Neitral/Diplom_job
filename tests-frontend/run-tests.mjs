import { runApiServiceTests } from "./api-service.test.mjs";
import { runCoursesModelTests } from "./courses-model.test.mjs";

const tests = [
    ["ApiService", runApiServiceTests],
    ["CoursesModel", runCoursesModelTests],
];

let failed = false;

for (const [name, fn] of tests) {
    try {
        await fn();
        console.log(`PASS ${name}`);
    } catch (error) {
        failed = true;
        console.error(`FAIL ${name}`);
        console.error(error);
    }
}

if (failed) {
    process.exitCode = 1;
} else {
    console.log("Frontend tests passed");
}
