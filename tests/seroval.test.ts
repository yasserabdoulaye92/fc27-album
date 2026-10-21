import { test } from "node:test";
import assert from "node:assert/strict";
import { extractBalanced, findObjects, parseSeroval } from "../lib/seroval.ts";

test("conversion seroval -> valeur JavaScript", () => {
  const text =
    '{id:91,name:"Rayo \\"RV\\" \\x3Cb>",ok:!0,ko:!1,none:void 0,grades:$R[17]=[$R[18]={name:"D",threshold:10}],again:$R[18]}';
  assert.deepEqual(parseSeroval(text), {
    id: 91,
    name: 'Rayo "RV" <b>',
    ok: true,
    ko: false,
    none: null,
    grades: [{ name: "D", threshold: 10 }],
    again: null,
  });
});

test("les deux-points dans une chaîne ne sont pas pris pour des clés", () => {
  assert.deepEqual(parseSeroval('{label:"a,b:c",url:"/x/y:z/"}'), { label: "a,b:c", url: "/x/y:z/" });
});

test("extraction d'un objet équilibré au milieu d'un script", () => {
  const source = 'x=[1,{a:"}",b:{c:[2]}},3]';
  assert.equal(extractBalanced(source, source.indexOf("{")), '{a:"}",b:{c:[2]}}');
});

test("recherche de tous les objets d'un type", () => {
  const source = 'f($R[1]={id:1,categoryId:2,name:"A"},$R[2]={id:2,categoryId:2,name:"B"},{id:3,other:1})';
  const sets = findObjects(source, /\{id:\d+,categoryId:/);
  assert.deepEqual(sets, [
    { id: 1, categoryId: 2, name: "A" },
    { id: 2, categoryId: 2, name: "B" },
  ]);
});
