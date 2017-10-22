import * as disir from '../src/index';
import { disirpb } from '../dist/disirpb';

import { expect } from 'chai';
import 'mocha';

describe('Instance', function() {

  let requestCommandId: number;
  let request: disirpb.Request;
  let response: disirpb.Response;

  // Testable send method
  let testsend = (msg: Uint8Array) : any => {
    // Store command identifier used in the request

    let decodedMsg : disirpb.Request = disirpb.Request.decode(msg);
    if (typeof decodedMsg.commandIdentifier === "number") {
      requestCommandId = decodedMsg.commandIdentifier;
    } else {
      requestCommandId = decodedMsg.commandIdentifier.toNumber();
    }
    // no-op
    return false;
  }

  let instance = new disir.Instance(testsend);

  it('resolves the send promise', function(done) {

    let fromClient = disirpb.Request.create({});

    instance.send(fromClient)
      .then(function(result) {
        expect(result).to.deep.equal(response);
        done();
      });

    // Fire of the event that resolves the send promise
    response = disirpb.Response.create({
      commandIdentifier: requestCommandId,
    });

    instance.receive(response);
  });

  it("queryAvailableGroups returns array of group id on succesful response", function(done){
    let groupIdsArray: Array<string> = ["test", "group", "ids", "array"];

    // Send the command (with the asserts in resolved promise)
    instance.queryAvailableGroups()
      .then(function(result) {
        // Expect queryAvailableGroups to return availableGroups
        expect(result).to.deep.equal(groupIdsArray);

        // Expect queryAvailableGroups to populate instance.availableGroups
        expect(instance.availableGroups).to.deep.equal(groupIdsArray);
        done();
      });

    // Construct the received message to the request
    response = disirpb.Response.create({
      commandIdentifier: requestCommandId,
      status: disirpb.Status.OK,
      queryGroups: disirpb.ResponseQueryGroups.create({
        groupIds: groupIdsArray,
      })
    });

    // Issue the received message
    instance.receive(response);
  });

  describe("openGroup", function(){

    it("throws error when supplied with group that does not exist", function(){
      expect(function() {
        instance.openGroup("notexist");
      }).to.throw(Error);
    });

    it("returns previously instanciated group", function(){
      // Populate instance with testgroup
      instance.availableGroups.push("group_previous_instance");

      let group = instance.openGroup("group_previous_instance");
      let duplicate = instance.openGroup("group_previous_instance");

      expect(group).to.be.equal(duplicate);
    });


    it("inserts group into instance.group map", function(){
      // Populate instance with testgroup
      instance.availableGroups.push("group_in_map");

      // Assert instance map does not contain it
      expect(instance.group.get("group_in_map")).to.equal(undefined);

      let group = instance.openGroup("group_in_map");

      expect(group).to.equal(instance.group.get("group_in_map"));
    });

    it("returns group when group is present in availableGroups", function(){
      // Populate instance with testgroup
      instance.availableGroups.push("return_group");

      let group = instance.openGroup("return_group");

      expect(group).to.be.an.instanceof(disir.Group);
      expect(group.id).to.deep.equal("return_group");
    });
  });
});
