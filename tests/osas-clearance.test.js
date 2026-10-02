import test from 'node:test';
import assert from 'node:assert/strict';
import {clearanceOptions,decideClearance} from '../src/components/osas/clearanceRules.js';
test('clearance requires recorded grounds and preserves completed reviews',()=>{
 const student={name:'Student',status:'Pending Review',history:[]};
 const open=[{student:'Student',status:'Open'}];
 assert.equal(clearanceOptions(student,open).Cleared,true);
 assert.equal(clearanceOptions(student,open)['On Hold'],false);
 assert.throws(()=>decideClearance(student,'On Hold','A detailed review note.',open),/not supported/);
 const pending=[{student:'Student',decision:{condition:'Counseling',conditionDone:false}}];
 assert.equal(clearanceOptions(student,pending).Cleared,false);
 assert.equal(clearanceOptions(student,pending)['Requires Resolution'],true);
 assert.equal(clearanceOptions(student,[{student:'Other',decision:{outcome:'Clearance Hold Recommended'}}])['On Hold'],false);
 assert.equal(clearanceOptions({...student,status:'On Hold'},[]).Cleared,false);
 const cleared=decideClearance(student,'Cleared','No recorded decision prevents clearance.',open);
 assert.equal(cleared.status,'Cleared');assert.equal(student.history.length,0);
 assert.throws(()=>decideClearance(cleared,'Maintain','A detailed review note.',[]),/complete/);
});
