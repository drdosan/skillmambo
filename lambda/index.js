/* *
 * This sample demonstrates handling intents from an Alexa skill using the Alexa Skills Kit SDK (v2).
 * Please visit https://alexa.design/cookbook for additional examples on implementing slots, dialog management,
 * session persistence, api calls, and more.
 * */
const Alexa = require('ask-sdk-core');
const persistenceAdapter = require('ask-sdk-s3-persistence-adapter');
const axios = require('axios');



/* REQUISIÇÕES A API */

const getRandomArbitrary = (min, max) => {
  return Math.random() * (max - min) + min;
}

const getSearchEmail = async (email) => {
  try {
    const url = 'https://mraqeu0ydl.execute-api.us-east-2.amazonaws.com/dev/checkUserByEmail/'+email;
    const header = { headers: { "x-api-key": '1gJm5CcXc21H52KpBhmv15qYLXU41a4y6cwRPh2s' } };
    return await axios.get(url,header);
  } catch (error) {
    console.error(error)
  }
}

const getRecipe = async (recipeId) => {
  try {
    return await axios.get('https://pn5jquenbg.execute-api.us-east-1.amazonaws.com/recipes/getrecipe/'+recipeId)
  } catch (error) {
    console.error(error)
  }
}

const addRecipe = async (recipeId) => {
  try {
    return await axios.get('https://pn5jquenbg.execute-api.us-east-1.amazonaws.com/recipes/addingredients/'+recipeId)
  } catch (error) {
    console.error(error)
  }
}

const textRecipe = async (recipeId) => {
    const recipe = await getRecipe(recipeId);
    let speaker = 'Aqui vai sua receita de '+recipe.data[0].title+', '+recipe.data[0].subtitle+'. Sua receita fica pronta em '+recipe.data[0].totalTimeInMinutes+' minutos e serve '+recipe.data[0].servings+' pessoas. Você deseja ouvir os ingredientes ou modo de preparo?';
    return speaker;
}

const addIngredientsRecipe = async (recipeId) => {
    const ingredients = await addRecipe(recipeId);
    console.log(ingredients);
    const listTerm = [];
    ingredients.data.map(function(item) {
        listTerm.push(item.listTerm.toLowerCase());
    })
    return listTerm;
}

const ingredientsRecipe = async (recipeId) => {
    const recipe = await getRecipe(recipeId);
    let speaker = 'Estes são os ingredientes que vamos precisar. ';
    recipe.data[0].parts.map(function (item) {
        if(item) {
        if(item.Ingredients) {
        speaker += 'Ingredientes '+item.title+'. ';
          item.Ingredients.map(function(ingredients) {
              speaker += ingredients.ingredient+'. ';
          })
        }
        }
    });      
    speaker += 'Devo repetir os ingredientes, incluí-los em sua lista Mambo, ou prefere ouvir o modo de preparo?'
    return speaker;
}

const prepsRecipe = async (recipeId) => {
    const recipe = await getRecipe(recipeId);
    let speaker = 'Este é o modo de preparo. ';
    recipe.data[0].parts.map(function (item) {
        if(item) {
        if(item.Preps) {
        speaker += 'Preparo '+item.title+'. ';
          item.Preps.map(function(preps) {
              speaker += preps.prep+'. ';
          })
        }
        }
    }); 
    speaker += 'Devo repetir o modo de preparo, prefere ouvir os ingredientes ou já está tudo pronto?'
    return speaker;
}


/* 1.0 INÍCIO  */

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    async handle(handlerInput) {
        
        const FULL_NAME_PERMISSION = "alexa::profile:name:read";
        const EMAIL_PERMISSION = "alexa::profile:email:read";
        
        const { serviceClientFactory } = handlerInput;
        
        try {
            
            const upsServiceClient = serviceClientFactory.getUpsServiceClient();
            const profileName  = await upsServiceClient.getProfileGivenName();
            const profileEmail = await upsServiceClient.getProfileEmail();
            
            const attributesManager = handlerInput.attributesManager;
            const itensList = attributesManager.getSessionAttributes().itens;
            const profile = await attributesManager.getPersistentAttributes();
            
            let speakOutput = '';
            let speakOutputRePrompt = '';
            
            const random = parseInt(getRandomArbitrary(0,100));
            
            if(!profile.email || random <= 85) {
                 attributesManager.setSessionAttributes({ "zona": "add" });
                /* 1.01 DA VUI */
                if(!profile.email) {
                    attributesManager.setPersistentAttributes({"email": profileEmail, "qtd": 1, "emailIsSincronized": null });
                    await attributesManager.savePersistentAttributes();
                    speakOutputRePrompt = 'Quer começar agora mesmo? Basta falar por exemplo, “adicionar ovos”, e seu produto estará em sua lista.';
                    speakOutput = 'Olá ' +profileName+ '. Eu sou o supermercado Mambo, seja bem vindo. Comigo você poderá adicionar itens em sua lista de compras e deixarei tudo preparado para finalizar seu pedido no aplicativo Mambo. Também trago receitas especiais!<break time="1s"/> '+speakOutputRePrompt;
                    
                } else {
                    attributesManager.setPersistentAttributes({"email": profileEmail, "qtd": 1+parseInt(profile.qtd), "emailIsSincronized": null });
                    await attributesManager.savePersistentAttributes();
                    /* 1.02B DA VUI */
                    if(itensList) {
                        speakOutput = 'Olá ' +profileName+ '. Deseja ver sua lista ou adicionar um item?';
                        speakOutputRePrompt = speakOutput;
                    }
                    /* 1.02 DA VUI */
                    else {
                        speakOutputRePrompt = 'Basta falar por exemplo, “adicionar ovos”, e seu produto estará em sua lista.';
                        speakOutput = 'Olá ' +profileName+ '. Deseja adicionar um item? '+speakOutputRePrompt;
                        
                    }
                }
            }
            /* 1.05 DA VUI */
            else {
                attributesManager.setSessionAttributes({ "zona": "recipe" });
                speakOutput = 'Olá ' +profileName+ ', Tenho uma receita especial. Deseja ouvir?';
                speakOutputRePrompt = speakOutput;
                attributesManager.setPersistentAttributes({"email": profileEmail, "qtd": 1+parseInt(profile.qtd), "emailIsSincronized": null });
                await attributesManager.savePersistentAttributes();
            }

            return handlerInput.responseBuilder
                .speak(speakOutput)
                .reprompt(speakOutput)
                .getResponse();
     
            
        } catch (error) {
            /* ERRO 4.04 DA VUI */
            if ( error.statusCode === 403 ){
                const speakOutput = "Olá, eu sou o supermercados Mambo e para sua melhor experiência preciso que vá a seu aplicativo Alexa e autorize as permissões do Mambo Skill. Entre lá, autorize e volte aqui. Estou te esperando. Até logo!";
                return handlerInput.responseBuilder
                    .speak(speakOutput)
                    .withAskForPermissionsConsentCard([FULL_NAME_PERMISSION,EMAIL_PERMISSION])
                    .getResponse();
            } 
            /* ERRO 4.05 DA VUI */
            else {
                console.log(error.name);
                const speakOutput = "Opss... Houve um erro, mas não se preocupe, já alertei meus criadores."
                 return handlerInput.responseBuilder
                    .speak(speakOutput)
                    .getResponse();
            }
        }
        
    }
};


/* 2.0 LISTA DE COMPRAS */

const AddItensIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AddItensIntent';
    },
    async handle(handlerInput) {
        
        let item = handlerInput.requestEnvelope.request.intent.slots.itens.value;
        let speakOutput = '';
        let speakOutputRePrompt = '';
        const attributesManager = handlerInput.attributesManager;
        const itensList = attributesManager.getSessionAttributes().itens;
        const zona = attributesManager.getSessionAttributes().zona;
        let profile = await attributesManager.getPersistentAttributes();
        
        if(profile.emailIsSincronized === null || !profile.emailIsSincronized) {
            const searchEmail = await getSearchEmail(profile.email); 
            attributesManager.setPersistentAttributes({"email": profile.email, "qtd": profile.qtd, "emailIsSincronized": searchEmail.hasEmail });
            await attributesManager.savePersistentAttributes();
            profile = await attributesManager.getPersistentAttributes();
        }
    
      
                
        if(item === 'sim') {
            if(zona === "add") {
                speakOutput = 'Ok, basta falar adicionar e o nome do Item para eu incluir em sua lista';
                speakOutputRePrompt = speakOutput;
            }
            if(zona === "remove") {
                speakOutput = 'Ok, basta falar remover e o nome do Item para eu incluir em sua lista';
                speakOutputRePrompt = speakOutput;
            }
            if(zona === "recipe") {
                const recipe = await textRecipe(1);
                speakOutput = recipe;
                speakOutputRePrompt = recipe;
                attributesManager.setSessionAttributes({ "zona": "add_recipe" });
            }
        }
        else if(item === 'não') {
            if(zona === 'ver_lista') {
                const phrases = ['<p>Até Logo</p>', '<p>Nos vemos em breve</p>', '<p>Tenha um ótimo dia</p>'];
                const random = getRandomArbitrary(0,2)
                speakOutput = 'Ok, '+phrases[parseInt(random)];
                speakOutputRePrompt = speakOutput;
            } else {
                attributesManager.setSessionAttributes({ "zona": "ver_lista" });
                speakOutput = 'Ok, deseja ouvir a sua lista?';
                speakOutputRePrompt = speakOutput;
            }
        }
        else {
            if(zona === 'add') {
                if(itensList) {
                    if(itensList.includes(item)) {
                        speakOutputRePrompt = 'Deseja adicionar mais algum item em sua lista?';
                        speakOutput = '<amazon:emotion name="disappointed" intensity="high">Hummm.</amazon:emotion> '+item+' já está em sua lista. ' + speakOutputRePrompt;
                    } else { 
                        if(profile.emailIsSincronized === true) {
                            speakOutputRePrompt = 'Deseja adicionar mais algum item em sua lista?';
                            speakOutput = 'Adicionei '+item+' em sua lista. '+speakOutputRePrompt;
                        }
                        else {
                            speakOutputRePrompt = 'Deseja adicionar mais algum item em sua lista?';
                            speakOutput = 'Adicionei '+item+' em sua lista. <break time="0.5s"/> Mas lembre-se, entre no aplicativo Mambo, cadastre uma conta com seu email Alexa e sua lista já estará pronta. <break time="0.5s"/>'+speakOutputRePrompt;
                        }
                        itensList.push(item);
                        attributesManager.setSessionAttributes({ "itens": itensList, "zona": "add" });
                    }
                }
                else {
                    if(profile.qtd <= 3) {
                        if(profile.emailIsSincronized === true) {
                            speakOutputRePrompt = 'Deseja adicionar mais algum item em sua lista?';
                            speakOutput = '<p>Agora você tem uma lista com '+item+'. Você pode me pedir para adicionar, remover ou ler sua lista.</p> <p>E lembre-se, basta entrar no aplicativo Mambo e sua lista já estará pronta! </p><break time="1s"/> '+speakOutputRePrompt;
                        }
                        else {
                            speakOutputRePrompt = 'Deseja adicionar mais algum item a sua lista?';
                            speakOutput = '<p>Agora você tem uma lista com '+item+'. Você pode me pedir para adicionar, remover ou ler sua lista.</p><break time="1s"/>  <p>Hmmm. Mas não encontrei seu email '+profile.email+'. </p> <break time="0.5s"/> <p>Ou você não tem um login no aplicativo Mambo, ou utiliza emails diferentes, mas sem problemas.</p> <p>Basta entrar no aplicativo Mambo, cadastar uma conta com seu email Alexa e sua lista já estará pronta </p><break time="1s"/> '+speakOutputRePrompt; }
                        }
                    else {
                        if(profile.emailIsSincronized === true) {
                            speakOutputRePrompt = 'Deseja adicionar mais algum item em sua lista?';
                            speakOutput = item+' adicionado em sua lista! '+speakOutputRePrompt;
                        }
                        else {
                            speakOutputRePrompt = 'Deseja adicionar mais algum item em sua lista?';
                            speakOutput = 'Adicionei '+item+' em sua lista. <break time="0.5s"/> Mas lembre-se, entre no aplicativo Mambo, cadastre uma conta com seu email Alexa e sua lista já estará pronta. <break time="0.5s"/>'+speakOutputRePrompt;
                        }
                    }
                    attributesManager.setSessionAttributes({ "itens": [item], "zona": "add" });
                }
            }
            
            
            
            
            
            if(zona === 'remove') {
                if(itensList.includes(item)) {
                    speakOutputRePrompt = 'Deseja remover mais algum item em sua lista?';
                    speakOutput = item+' removido da sua lista! '+speakOutputRePrompt;
                    itensList.splice(itensList.indexOf(item), 1);
                    if(itensList.length === 0) {
                        attributesManager.setSessionAttributes({ "itens": itensList, "zona": "add" });
                    } else {
                        attributesManager.setSessionAttributes({ "itens": itensList, "zona": "remove" });
                    }
                }
                else {
                    speakOutputRePrompt = 'Deseja remover mais algum item da sua lista?';
                    speakOutput = item+' não encontrado em sua lista! '+speakOutputRePrompt;
                }
            }
        }
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutputRePrompt)
            .getResponse();
    }
};

const VerListaIntent = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'VerListaIntent';
    },
    handle(handlerInput) {
        
        const attributesManager = handlerInput.attributesManager;
        const itensList = attributesManager.getSessionAttributes().itens;
        attributesManager.setSessionAttributes({ "itens": itensList, "zona": "add" });
        
        const list = itensList.join(',');
        
        let speakOutput = '';
        let speakOutputRePrompt = '';
        
        if(list.length > 0) {
            speakOutput = 'Sua lista tem '+list+'. Deseja adicionar ou remover algum item da sua lista?';
            speakOutputRePrompt = 'Deseja adicionar ou remover algum item da sua lista?';
        } else {
            speakOutput = 'Sua lista está vazia. Deseja adicionar algum item em sua lista? Diga Adicionar';
            speakOutputRePrompt = 'Deseja adicionar algum item em sua lista? Diga Adicionar';
        }
        
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutputRePrompt)
            .getResponse();
    }
};

const DeleteItemIntent = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'DeleteItemIntent';
    },
    handle(handlerInput) {
        let speakOutput = '';
        let speakOutputRePrompt = '';        
        const item = handlerInput.requestEnvelope.request.intent.slots.itens.value;
        const attributesManager = handlerInput.attributesManager;
        const itensList = attributesManager.getSessionAttributes().itens;
        attributesManager.setSessionAttributes({ "itens": itensList, "zona": "remove" });
        if(item === 'sim') {
            speakOutput = 'Qual Item deseja remover da sua lista? Basta falar Remover e o nome do Item';
            speakOutputRePrompt = 'Qual Item deseja remover da sua lista? Basta falar Remover e o nome do Item';
        }
        else if(item === 'não') {
            speakOutput = 'Deseja ver sua lista ou adicionar um item?';
            speakOutputRePrompt = 'Deseja ver sua lista ou adicionar um item?';
        }
        else {
            if(itensList.includes(item)) {
                speakOutput = item+' removido da sua lista! Deseja remover mais algum item da sua lista?';
                speakOutputRePrompt = 'Deseja remover mais algum item da sua lista?';
                itensList.splice(itensList.indexOf(item), 1);
                if(itensList.length === 0) {
                    attributesManager.setSessionAttributes({ "itens": itensList, "zona": "add" });
                } else {
                    attributesManager.setSessionAttributes({ "itens": itensList, "zona": "remove" });
                }
            }
            else {
                speakOutput = item+' não encontrado em sua lista! Deseja remover mais algum item da sua lista?';
                speakOutputRePrompt = 'Deseja remover mais algum item da sua lista? Diga Sim ou Não.';
            }
        }
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutputRePrompt)
            .getResponse();
    }
};


/* 3.0 RECEITAS */

const IngredientsIntent = {
        canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'IngredientsIntent';
    },
    async handle(handlerInput) {
    
        let speakOutput = '';
        let speakOutputRePrompt = '';
        const attributesManager = handlerInput.attributesManager;
        const itensList = attributesManager.getSessionAttributes().itens;
        const item = handlerInput.requestEnvelope.request.intent.slots.addIngredients.value;
        
        
        if(item) {
            if(itensList) {
                const itensRecipes = await addIngredientsRecipe(1);
                const newItens = itensList.concat(itensRecipes);
                const novoItens = newItens.filter((este, i) => newItens.indexOf(este) === i);
                attributesManager.setSessionAttributes({ "itens": novoItens, "zona": "add" });
            }
            else {
                const itensRecipes = await addIngredientsRecipe(1);
                const novoItens = itensRecipes.filter((este, i) => itensRecipes.indexOf(este) === i);
                attributesManager.setSessionAttributes({ "itens": itensRecipes, "zona": "add" });
            }
                speakOutput = 'Itens adicionados em sua lista Mambo! Deseja ver sua lista ou ouvir o modo de preparo?';
                speakOutputRePrompt = 'Deseja ver sua lista ou ouvir o modo de preparo?';
        }
        else {
            const ingredientsReceita = await ingredientsRecipe(1);
            speakOutput = ingredientsReceita;
            speakOutputRePrompt = ingredientsReceita;
        }
        
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutputRePrompt)
            .getResponse();
    }
    
};

const PreparosIntent = {
        canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'PreparosIntent';
    },
    async handle(handlerInput) {
    
        let speakOutput = '';
        let speakOutputRePrompt = '';
        const preparosReceita = await prepsRecipe(1);
        speakOutput = preparosReceita;
        speakOutputRePrompt = preparosReceita;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutputRePrompt)
            .getResponse();
    }
    
};

/* 3.1 LOGIN MAMBO */

const NotLoginMamboIntent = {
        canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'NotLoginMamboIntent';
    },
    async handle(handlerInput) {
        const attributesManager = handlerInput.attributesManager;
        const profile = await attributesManager.getPersistentAttributes();
        const speakOutputRePrompt = 'Deseja adicionar mais algum item a sua lista?';
        const speakOutput = 'Sem problemas, basta entrar no aplicativo Mambo com o email '+profile.email+'  e sua lista já estará pronta para você. ' + speakOutputRePrompt;
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutputRePrompt)
            .getResponse();
    }
    
};

const YesLoginMamboIntent = {
        canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'YesLoginMamboIntent';
    },
    async handle(handlerInput) {
        const attributesManager = handlerInput.attributesManager;
        const profile = await attributesManager.getPersistentAttributes();
        const speakOutputRePrompt = 'Deseja adicionar mais algum item a sua lista?';
        const speakOutput = 'Sem problemas. Basta entrar no seu aplicativo Mambo e alterar seu email para '+profile.email+' e sua lista já estará pronta!' + speakOutputRePrompt;
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutputRePrompt)
            .getResponse();
    }
    
};


/* 4.0 FALLBACK E OUTROS  */

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'Você pode dizer olá para mim! Como posso ajudar?';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const phrases = ['<p>Até Logo</p>', '<p>Nos vemos em breve</p>', '<p>Tenha um ótimo dia</p>'];
        const random = getRandomArbitrary(0,phrases.length);
        const speakOutput = 'Ok, '+phrases[random];
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};

const FallbackIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'Hmmm... Não consegui entender. Deseja começar novamente?';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

/* 4.5 DA VUI  */
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        const speakOutput = 'Opss... Houve um erro, mas não se preocupe, já alertei meus criadores.';
        console.log(`~~~~ Error handled: ${JSON.stringify(error)}`);

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        console.log(`~~~~ Session ended: ${JSON.stringify(handlerInput.requestEnvelope)}`);
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse(); // notice we send an empty response
    }
};

const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = `Você acabou de desencadear ${intentName}`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};


/* EXPORTAÇÃO DAS FUNÇÕES */

exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        AddItensIntentHandler,
        VerListaIntent,
        DeleteItemIntent,
        IngredientsIntent,
        PreparosIntent,
        NotLoginMamboIntent,
        YesLoginMamboIntent,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        FallbackIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler)
    .addErrorHandlers(
        ErrorHandler)
    .withCustomUserAgent('sample/hello-world/v1.2')
    .withPersistenceAdapter(
        new persistenceAdapter.S3PersistenceAdapter({bucketName: process.env.S3_PERSISTENCE_BUCKET})
    )
    .withApiClient( 
        new Alexa.DefaultApiClient()
    )
    .lambda();