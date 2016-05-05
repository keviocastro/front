import { Component, EventEmitter, NgZone } from 'angular2/core';
import { CORE_DIRECTIVES, FORM_DIRECTIVES, ControlGroup, FormBuilder, Validators } from 'angular2/common';
import { Router, RouteParams, RouterLink } from 'angular2/router';

import { Material } from '../../../directives/material';
import { Client } from '../../../services/api';
import { SessionFactory } from '../../../services/session';


@Component({
  selector: 'minds-form-login',
  outputs: [ 'done' ],
  templateUrl: 'src/components/forms/login/login.html',
  directives: [ CORE_DIRECTIVES, FORM_DIRECTIVES, Material, RouterLink]
})

export class LoginForm {

	session = SessionFactory.build();
  errorMessage : string = "";
  twofactorToken : string = "";
  hideLogin : boolean = false;
  inProgress : boolean = false;
  referrer : string;
  minds = window.Minds;

  form : ControlGroup;

  done : EventEmitter<any> = new EventEmitter();

	constructor(public client : Client, public router: Router, fb: FormBuilder, private zone : NgZone){

    this.form = fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });

	}

	login(){
    if(this.inProgress)
      return;

    this.errorMessage = "";
    this.inProgress = true;
		var self = this; //this <=> that for promises
		this.client.post('api/v1/authenticate', {username: this.form.value.username, password: this.form.value.password})
			.then((data : any) => {
				this.form.value = null;
        this.inProgress = false;
				this.session.login(data.user);
        this.done.next(data.user);
			})
			.catch((e) => {

        this.inProgress = false;
        if(e.status == 'failed'){
          //incorrect login details
          self.errorMessage = "Incorrect username/password. Please try again.";
          self.session.logout();
        }

        if(e.status == 'error'){
          //two factor?
          self.twofactorToken = e.message;
          self.hideLogin = true;
        }

			});
	}

  twofactorAuth(code){
    var self = this;
    this.client.post('api/v1/authenticate/two-factor', {token: this.twofactorToken, code: code.value})
        .then((data : any) => {
          self.session.login(data.user);
          this.done.next(data.user);
        })
        .catch((e) => {
          self.errorMessage = "Sorry, we couldn't verify your two factor code. Please try logging again.";
          self.twofactorToken = "";
          self.hideLogin = false;
        });
  }

  loginWithFb(){
    window.onSuccessCallback = (user) => {
      this.zone.run(() => {
        this.session.login(user);
        this.done.next(user);
      });
    }
    window.onErrorCallback = (reason) => {
      if(reason){
        alert(reason);
      }
    };
    window.open(this.minds.site_url + 'api/v1/thirdpartynetworks/facebook/login');
  }

}
