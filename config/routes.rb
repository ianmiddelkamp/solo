Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  mount LetterOpenerWeb::Engine, at: "/letter_opener" if defined?(LetterOpenerWeb)

  post "/auth/login", to: "auth#login"
  get  "/features",   to: "features#index"

  get    "/timer",       to: "timer_sessions#current"
  post   "/timer/start", to: "timer_sessions#start"
  post   "/timer/stop",  to: "timer_sessions#stop"
  patch  "/timer",       to: "timer_sessions#update"
  delete "/timer",       to: "timer_sessions#cancel"

  resource :business_profile, only: [:show, :update] do
    patch :update_logo
    delete :destroy_logo
  end

  resources :estimates, except: [:new, :edit] do
    member do
      get  :pdf
      post :regenerate_pdf
      post :send_estimate
    end
  end

  resources :invoices, except: [:new, :edit] do
    collection do
      get :unbilled_entries
    end
    member do
      get  :pdf
      post :regenerate_pdf
      post :send_invoice
      post :mark_as_paid
      post :send_receipt
    end
  end

  resources :expenses, except: [:new, :edit] do
    collection { post :parse_receipt }
    member { get :receipt }
  end
  resources :hst_returns, except: [:new, :edit] do
    collection do
      get :calculate
    end
  end
  resources :cca_assets, except: [:new, :edit]
  resource :home_office_profile, only: [:show, :update]
  get "/t2125", to: "t2125#show"

  resources :charge_codes, except: [:new, :edit, :show]
  resources :time_entries, only: [:index, :show, :create, :update, :destroy]

  resources :clients do
    resource :rate, only: [:show, :update]
  end
  resources :projects do
    member do
      post :sow_import, to: "sow_imports#create"
      patch :archive
    end
    resource :rate, only: [:show, :update]
    resources :time_entries, only: [:index, :create, :update, :destroy]
    resources :attachments, only: [:index, :create, :show, :destroy],
                            controller: :project_attachments
    resources :task_groups, only: [:index, :create, :update, :destroy] do
      collection do
        patch :reorder
      end
      resources :tasks, only: [:create, :update, :destroy] do
        collection do
          patch :reorder
        end
      end
    end
  end
end
