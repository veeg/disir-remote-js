
import { Instance } from './instance';
import { Mold } from './mold';
import { disirpb } from '../dist/disirpb';

//
// Represent a instance group
//
export class Group {

  readonly id: string;

  // The molds that are available on this group_id for this Disir-frontend instance.
  readonly availableMolds: Array<string> = [];

  //! Map of allocated molds
  readonly mold: Map<string, Mold>;

  // Client-side Disir.Instance.
  private instance: Instance;

  // This constructor should never be called outside of the disir namespace
  // e.g., don't construct this when using disir
  public constructor(instance: Instance, id: string) {
    this.instance = instance;
    this.id = id;
  }

  // Issue a query to retrieve the list of available molds for this group.
  // Successful query will populate self.availableMolds
  //
  // Returns a Promise
  public queryAvailableMolds() : Promise<Array<string>> {

    //request.setQueryMoldEntries(plugin_name);
    //message.setRequest(request);
    let request = disirpb.Request.create({queryMoldEntries: "test"});

    return new Promise((resolve, reject) => {
      this.instance.send(request)
        .then(function (response) {
          // TODO: Add content of reponse to availableMolds


         // FIXME: Make a copy of it? Since the user may then manipulate
         // the array within this class.
         // Resolve this promise with the list of available molds.
          resolve(this.availableMolds);
        });
      });
  }

  // Allocate and attach a Mold to this group.
  // Mold must be present in availableMolds.
  // If the mold is already present in internal map, this reference is returned.
  public openMold(name: string) : Mold {
    return undefined;
  }
}

