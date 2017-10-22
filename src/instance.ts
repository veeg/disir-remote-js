//
// Disir-frontend Javascript client-side library
//

import { Group } from './group';
import { disirpb } from '../dist/disirpb';


// Callback that must be supplied when creating a Disir.Instance
// This callback is invoked to issue the request from the client-side library
// to the Disir-frontend.
// The msg array is a buffer encoded disirpb.FromClient object.
// QUESTION: Return value should indicate error or not? Maybe return error string or null?
export type SendCallback = (msg: Uint8Array) => void;

type SendResolve = (msg: any) => void;

//
// Main logic gate to initiate and interact with Disir-frontend.
//
export class Instance {

  // Method to invoke to send the client request to the frontend.
  readonly sendxxx: SendCallback;

  // The groups available in this Disir-frontend instance
  public availableGroups: Array<string> = [];

  // Map of allocated groups
  readonly group: Map<string, Group>;

  // Each command sent to Disir-frontend is enumerated with a unique command identifier.
  // This tracks the current dispatched command and is incremented for each new command issued.
  private currentCommandId: number = 1;

  // Map of commands issued with pending promises waiting to be resolved
  // or rejected.
  private commandPromises: Map<number, SendResolve>;

  public constructor(send: SendCallback) {
    if (send === undefined) {
      throw new Error("constructed with send argument undefined");
    }
    this.sendxxx = send;
    this.commandPromises = new Map<number, SendResolve>();
    this.group = new Map<string, Group>();
  }

  // Issue the send operation
  // Register the input msg with the commandPromise
  //
  // Returns a promise that is resolved
  public send(request: disirpb.Request) : Promise<any> {
    let commandId: number = this.currentCommandId;
    this.currentCommandId += 1;

    request.commandIdentifier = commandId;

    console.log("Sending command:");
    console.log(request);

    return new Promise((resolve, reject) => {
      let errorMessage = disirpb.Request.verify(request);
      if (errorMessage) {
        reject(errorMessage);
      }
      else {
        this.commandPromises.set(commandId, resolve);

        // FIXME: Handle error condition and throw a reject? Reject is thrown if error is raised
        this.sendxxx(disirpb.Request.encode(request).finish());
      }
    });
  }

  public receive(inputMsg: disirpb.Response | Uint8Array) {

    let response: disirpb.Response;

    console.log("Generic receive method invoked");
    console.log(inputMsg);

    // Handle both types
    if (inputMsg instanceof disirpb.Response) {
      response = inputMsg;
    } else {
      response = disirpb.Response.decode(inputMsg);
      let errorMessage = disirpb.Response.verify(response);
      if (errorMessage) {
        console.log("receive buffer produced in-correct ToClient message: " + errorMessage);
        return;
      }
    }


    console.log("toClient message");
    console.log(response);

    let commandId: number;
    if (typeof response.commandIdentifier === "number") {
      commandId = response.commandIdentifier;
    } else {
      commandId = response.commandIdentifier.toNumber();
    }

    let resolve: SendResolve = this.commandPromises.get(commandId);
    if (resolve === undefined) {
      console.log("Ignoring commandId " + commandId + ".");
      return;
    }

    this.commandPromises.delete(commandId);
    resolve(response);
  }

  // Issue a query to retrieve the list of available groups
  // TODO: return promise with array of strings?
  public queryAvailableGroups() : Promise<any> {

    let request = disirpb.Request.create({
        queryGroups: true,
    });

    console.log("Sending queryAvailableGroups")

    return this.send(request)
      .then((result) => {
        if (result.status !== disirpb.Status.OK) {
          // TODO: Handle rejection
          return Promise.reject("test error string");
        }

        this.availableGroups = result.queryGroups.groupIds.slice(0);
        return Promise.resolve(this.availableGroups);
      });
  }

  // Allocate and attach a Group to this instance.
  // Group must be present in availableGroups.
  // If the group is already present in internal map, this reference is returned.
  public openGroup(name: string) : Group {
    // TODO: Check if name is part of this.available_groups,
    // panic if not.

    if (!this.availableGroups.includes(name)) {
      throw new Error("cannot open group whose not in availableGroups: " + name);
    }

    // check if name already exists - return the previously opened map
    if (this.group.has(name)) {
      return this.group.get(name);
    }

    let group = new Group(this, name);
    this.group.set(name, group);
    return group;
  }
}

