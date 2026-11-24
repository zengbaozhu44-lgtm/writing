#!/usr/bin/env node
/**
 * EO-P3 VERIFY — Operator Proxy (W-10 / I-12)
 *
 * Proves: Operator ≠ Authority Subject; Execution ≠ obtains;
 * Proxy ≠ automatic Author authorization; post ↛ Act (EO-P6 Act is separate).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  stampOperatorCliPost,
  assertOperatorProxyStamp,
  AUTHORITY_SUBJECT,
  AUTHORITY_ACT_STATUS,
  AUTHORITY_ACT_ON_POST,
  DELEGATION_RECORDING_STATUS,
  CLAIM_LEVEL_AUTHORITY,
} from '../packages/inkos-core/src/lib/operator-proxy.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let failures = 0;
const fail = (msg) => {
  failures += 1;
  console.error(`  FAIL: ${msg}`);
};
const ok = (msg) => console.log(`  ok: ${msg}`);

console.log('\n== EO-P3 Operator Proxy VERIFY ==');

if (AUTHORITY_SUBJECT !== 'Author') fail('Authority Subject must be Author');
else ok('Authority Subject = Author');

if (AUTHORITY_ACT_STATUS !== 'NOT_EXECUTED_ON_THIS_PATH' && AUTHORITY_ACT_STATUS !== AUTHORITY_ACT_ON_POST) {
  fail('post path must not execute Authority Act');
} else ok('post path: Authority Act not executed');

if (DELEGATION_RECORDING_STATUS !== 'NOT_IMPLEMENTED_ON_THIS_PATH') {
  fail('post path must not implement delegation recording');
} else ok('post path: delegation not recorded / not assumed');

if (CLAIM_LEVEL_AUTHORITY !== 'NOT_THIS_PATH') fail('post path must not claim Claim-level Authority');
else ok('post path: not Claim-level Authority');

const stamped = stampOperatorCliPost({ chapter: 1, updated: ['08_current_state'] });
const check = assertOperatorProxyStamp(stamped);
if (!check.pass) fail(check.detail);
else ok('stamp: Operator≠Subject; Execution≠obtains; delegation not assumed');

if (stamped.d1OperatorProxy.authorDelegationAssumed !== false) {
  fail('must not assume Author authorization for Operator');
} else ok('Proxy ≠ automatic Author authorization');

if (stamped.d1OperatorProxy.producesObtains !== false) fail('stamp must not claim obtains');
else ok('Execution ≠ obtains');

const cliSrc = fs.readFileSync(path.join(ROOT, 'packages/inkos-core/src/cli.js'), 'utf8');
if (!cliSrc.includes('stampOperatorCliPost')) fail('CLI post must stamp Operator Proxy');
else ok('CLI post uses stampOperatorCliPost');
if (!/EO-P3|Executor=Operator|never Authority Subject/i.test(cliSrc)) {
  fail('CLI post missing EO-P3 Subject≠Executor comment');
} else ok('CLI post documents Subject≠Executor');

const postSrc = fs.readFileSync(
  path.join(ROOT, 'packages/inkos-core/src/workflows/post-chapter.js'),
  'utf8',
);
if (!postSrc.includes('EO-P3') || !/never sets Authority Subject|≠ Reality Status/i.test(postSrc)) {
  fail('applyPostChapter missing EO-P3 isolation comment');
} else ok('applyPostChapter documents no Subject=caller');

const proxyDoc = fs.readFileSync(
  path.join(ROOT, 'golden/reality/d1-implementation-contract/OPERATOR-PROXY.md'),
  'utf8',
);
for (const phrase of [
  'Authority Subject = Author',
  'Executor          = Operator',
  'Proxy identity成立 ≠ 已获得具体 Author 授权',
  'authorDelegationAssumed: false',
  'NO authorization schema',
]) {
  if (!proxyDoc.includes(phrase)) fail(`OPERATOR-PROXY.md missing: ${phrase}`);
}
ok('OPERATOR-PROXY.md binding phrases present');

const eo = fs.readFileSync(
  path.join(ROOT, 'golden/reality/d1-implementation-contract/EO-P3.md'),
  'utf8',
);
if (!eo.includes('NO default Operator→Author authorization')) fail('EO-P3 missing default-auth ban');
else ok('EO-P3 bans default authorization');

// Must not invent Act/authorization schema files under this EO
const contractDir = path.join(ROOT, 'golden/reality/d1-implementation-contract');
for (const name of fs.readdirSync(contractDir)) {
  if (/authorization-schema|authority-act-api|claim-schema/i.test(name)) {
    fail(`forbidden schema artifact: ${name}`);
  }
}
ok('no authorization / Act schema artifacts');

// operator-proxy.js must not implement Act execution
const proxySrc = fs.readFileSync(
  path.join(ROOT, 'packages/inkos-core/src/lib/operator-proxy.js'),
  'utf8',
);
if (/executeAuthorityAct|grantObtains|realityStatus\s*[:=]/i.test(proxySrc)) {
  fail('operator-proxy.js appears to implement Act/obtains');
} else ok('operator-proxy.js does not implement Act/obtains');

if (failures) {
  console.error(`\nEO-P3 VERIFY FAILED: ${failures}`);
  process.exit(1);
}
console.log('\nEO-P3 VERIFY PASSED — Operator Proxy isolated; STOP (do not auto-start P4)\n');
