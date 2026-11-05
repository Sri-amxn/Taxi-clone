import test from 'node:test';
import assert from 'node:assert/strict';
import {readApiResponse} from '../src/api-response.js';
test('valid JSON passes through',async()=>assert.deepEqual(await readApiResponse(new Response('{"status":"available"}')),{status:'available'}));
test('empty proxy errors explain backend check',async()=>assert.rejects(()=>readApiResponse(new Response('',{status:500})),/empty response.*HTTP 500.*Flask/));
test('HTML errors are not exposed',async()=>assert.rejects(()=>readApiResponse(new Response('<html>internal error</html>',{status:502})),/unreadable response.*HTTP 502/));
test('API validation errors are preserved',async()=>assert.rejects(()=>readApiResponse(new Response('{"error":"Invalid credentials"}',{status:401})),/Invalid credentials/));
