import { Outpost, OutpostsApi, OutpostTypeEnum, ProvidersApi } from "authentik-api";
import { t } from "@lingui/macro";
import { customElement, property } from "lit-element";
import { html, TemplateResult } from "lit-html";
import { DEFAULT_CONFIG } from "../../api/Config";
import { until } from "lit-html/directives/until";
import { ifDefined } from "lit-html/directives/if-defined";
import "../../elements/forms/HorizontalFormElement";
import "../../elements/CodeMirror";
import YAML from "yaml";
import { ModelForm } from "../../elements/forms/ModelForm";

@customElement("ak-outpost-form")
export class OutpostForm extends ModelForm<Outpost, string> {
    @property()
    type: OutpostTypeEnum = OutpostTypeEnum.Proxy;

    @property({type: Boolean})
    embedded: boolean = false;

    loadInstance(pk: string): Promise<Outpost> {
        return new OutpostsApi(DEFAULT_CONFIG)
            .outpostsInstancesRetrieve({
                uuid: pk,
            })
            .then((o) => {
                this.type = o.type || OutpostTypeEnum.Proxy;
                return o;
            });
    }

    getSuccessMessage(): string {
        if (this.instance) {
            return t`Successfully updated outpost.`;
        } else {
            return t`Successfully created outpost.`;
        }
    }

    send = (data: Outpost): Promise<Outpost> => {
        if (this.instance) {
            return new OutpostsApi(DEFAULT_CONFIG).outpostsInstancesUpdate({
                uuid: this.instance.pk || "",
                outpostRequest: data,
            });
        } else {
            return new OutpostsApi(DEFAULT_CONFIG).outpostsInstancesCreate({
                outpostRequest: data,
            });
        }
    };

    renderProviders(): Promise<TemplateResult[]> {
        switch (this.type) {
            case OutpostTypeEnum.Proxy:
                return new ProvidersApi(DEFAULT_CONFIG)
                    .providersProxyList({
                        ordering: "pk",
                    })
                    .then((providers) => {
                        return providers.results.map((provider) => {
                            const selected = Array.from(this.instance?.providers || []).some(
                                (sp) => {
                                    return sp == provider.pk;
                                },
                            );
                            return html`<option
                                value=${ifDefined(provider.pk)}
                                ?selected=${selected}
                            >
                                ${provider.verboseName} ${provider.name}
                            </option>`;
                        });
                    });
            case OutpostTypeEnum.Ldap:
                return new ProvidersApi(DEFAULT_CONFIG)
                    .providersLdapList({
                        ordering: "pk",
                    })
                    .then((providers) => {
                        return providers.results.map((provider) => {
                            const selected = Array.from(this.instance?.providers || []).some(
                                (sp) => {
                                    return sp == provider.pk;
                                },
                            );
                            return html`<option
                                value=${ifDefined(provider.pk)}
                                ?selected=${selected}
                            >
                                ${provider.verboseName} ${provider.name}
                            </option>`;
                        });
                    });
        }
    }

    renderForm(): TemplateResult {
        return html`<form class="pf-c-form pf-m-horizontal">
            <ak-form-element-horizontal label=${t`Name`} ?required=${true} name="name">
                <input
                    type="text"
                    value="${ifDefined(this.instance?.name)}"
                    class="pf-c-form-control"
                    required
                />
            </ak-form-element-horizontal>
            <ak-form-element-horizontal label=${t`Type`} ?required=${true} name="type">
                <select
                    class="pf-c-form-control"
                    @change=${(ev: Event) => {
                        const target = ev.target as HTMLSelectElement;
                        this.type = target.selectedOptions[0].value as OutpostTypeEnum;
                    }}
                >
                    <option
                        value=${OutpostTypeEnum.Proxy}
                        ?selected=${this.instance?.type === OutpostTypeEnum.Proxy}
                    >
                        ${t`Proxy`}
                    </option>
                    <option
                        value=${OutpostTypeEnum.Ldap}
                        ?selected=${this.instance?.type === OutpostTypeEnum.Ldap}
                    >
                        ${t`LDAP (Technical preview)`}
                    </option>
                </select>
            </ak-form-element-horizontal>
            <ak-form-element-horizontal label=${t`Integration`} name="serviceConnection">
                <select class="pf-c-form-control">
                    <option value="" ?selected=${this.instance?.serviceConnection === undefined}>
                        ---------
                    </option>
                    ${until(
                        new OutpostsApi(DEFAULT_CONFIG)
                            .outpostsServiceConnectionsAllList({
                                ordering: "pk",
                            })
                            .then((scs) => {
                                return scs.results.map((sc) => {
                                    let selected = this.instance?.serviceConnection === sc.pk;
                                    if (scs.results.length === 1 && !this.instance) {
                                        selected = true;
                                    }
                                    return html`<option
                                        value=${ifDefined(sc.pk)}
                                        ?selected=${selected}
                                    >
                                        ${sc.name} (${sc.verboseName})
                                    </option>`;
                                });
                            }),
                        html`<option>${t`Loading...`}</option>`,
                    )}
                </select>
                <p class="pf-c-form__helper-text">
                    ${t`Selecting an integration enables the management of the outpost by authentik.`}
                </p>
                <p class="pf-c-form__helper-text">
                    See
                    <a target="_blank" href="https://goauthentik.io/docs/outposts/outposts"
                        >documentation</a
                    >.
                </p>
            </ak-form-element-horizontal>
            <ak-form-element-horizontal
                label=${t`Providers`}
                ?required=${!this.embedded}
                name="providers"
            >
                <select class="pf-c-form-control" multiple>
                    ${until(this.renderProviders(), html`<option>${t`Loading...`}</option>`)}
                </select>
                <p class="pf-c-form__helper-text">
                    ${t`You can only select providers that match the type of the outpost.`}
                </p>
                <p class="pf-c-form__helper-text">
                    ${t`Hold control/command to select multiple items.`}
                </p>
            </ak-form-element-horizontal>
            <ak-form-element-horizontal label=${t`Configuration`} name="config">
                <ak-codemirror
                    mode="yaml"
                    value="${until(
                        new OutpostsApi(DEFAULT_CONFIG)
                            .outpostsInstancesDefaultSettingsRetrieve()
                            .then((config) => {
                                let fc = config.config;
                                if (this.instance) {
                                    fc = this.instance.config;
                                }
                                return YAML.stringify(fc);
                            }),
                    )}"
                ></ak-codemirror>
                <p class="pf-c-form__helper-text">
                    ${t`Set custom attributes using YAML or JSON.`}
                </p>
                <p class="pf-c-form__helper-text">
                    See
                    <a
                        target="_blank"
                        href="https://goauthentik.io/docs/outposts/outposts#configuration"
                        >documentation</a
                    >.
                </p>
            </ak-form-element-horizontal>
        </form>`;
    }
}
